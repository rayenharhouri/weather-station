# WeatherHub — device firmware + simulator

Two ways to feed readings into your stack:

| Path | What it is | When to use |
|---|---|---|
| [`weatherhub-station/`](weatherhub-station/) | PlatformIO sketch for an ESP32 with BME280 + BH1750 over I²C. | When you have the hardware on your desk and want the real round-trip. |
| [`simulator/`](simulator/) | Python script that publishes the same MQTT payload from your laptop. | When you want to smoke-test the backend before flashing, or when you're iterating on the dashboard and don't want to wait for sensor cadence. |

Both publish the same payload shape to the same topic, so the backend ingest worker can't tell them apart.

---

## 1. Provisioning prerequisites

The backend needs to know about your tenant, station, and device before it accepts any readings. Run these once per device:

```sh
# 1. Boot the stack (if not already running)
docker compose up -d

# 2. Provision a tenant (if you don't have one)
docker compose exec backend node node_modules/.bin/ts-node \
  -r tsconfig-paths/register src/database/scripts/provision-tenant.ts \
  --slug=enit --name="ENIT Tunis" \
  --admin-email=admin@enit.test --admin-password=demo-pass-change-me

# 3. Seed a station + 24h of historical data so the dashboard isn't empty
docker compose exec backend node dist/database/scripts/seed-tenant-demo.js \
  --slug=enit

# 4. Look up the station's UUID — you'll need it in the next step
docker compose exec timescaledb \
  psql -U weatherhub -d tenant_enit -c "SELECT id, name FROM stations;"

# 5. Mint a device JWT (365-day lifetime by default)
docker compose exec backend node dist/database/scripts/device-provision.js \
  --tenant=enit --station=<the-uuid-from-step-4> --device-id=esp32-bench-1
```

The last command prints the JWT and the exact topic to publish to. **Capture the JWT now — it's the only time it'll be shown.**

---

## 2a. Quick path — OLED splash while you wait for sensors

If you've got the **HiLetgo ESP32 OLED Kit** in hand but the sensors haven't arrived yet, you can still flash the board today. The `splash` env drives only the onboard 0.96" OLED — no WiFi, no I²C sensors, no `config.h` — and shows a Japanese "近日公開 / COMING SOON" title card with twinkling sparkles + loading dots.

```sh
cd firmware/weatherhub-station
pio run -e splash -t upload
pio device monitor          # optional — confirms the boot log
```

What you'll see on the OLED:

```
┌────────────────────────────────┐
│  ✦  * WEATHERHUB STATION *  ✦  │
│   ─────────────────────────    │
│                                │
│         近日公開               │
│                                │
│        COMING SOON             │
│   ─────────────────────────    │
│  sensors: standby     ● ● ○    │
└────────────────────────────────┘
```

Six sparkles drift through the frame at staggered phases; three dots fill in sequence at the bottom. Nothing to wire — the OLED is internally routed on the dev board (GPIO 4 / 15 / 16).

When the sensors arrive, swap to the full firmware below.

---

## 2b. Flashing the full firmware (sensors connected)

### Install PlatformIO

Pick one:

```sh
# VS Code: install the "PlatformIO IDE" extension and you're done.
# CLI: pipx is the cleanest install
pipx install platformio
```

### Configure the sketch

```sh
cd firmware/weatherhub-station
cp src/config.example.h src/config.h
$EDITOR src/config.h
```

Fill in WiFi credentials, MQTT broker (your computer's LAN IP — not `localhost`, the ESP32 can't see that), tenant slug, station UUID, device JWT.

### Wire the sensors

```
ESP32           BME280         BH1750
─────           ──────         ──────
3V3   ────────  VCC  ───────── VCC
GND   ────────  GND  ───────── GND
GPIO 21 (SDA)── SDA  ───────── SDA
GPIO 22 (SCL)── SCL  ───────── SCL
```

Both modules sit on the same I²C bus — no need for a second pair of pins. See [docs/hardware-bom.md](../docs/hardware-bom.md) for full wiring.

### Build + flash

```sh
pio run -e esp32dev -t upload      # builds + flashes the full firmware
pio device monitor                 # 115200 baud — watch the boot log
```

You should see:

```
====================================================
  WeatherHub ESP32 station — Phase 1 (tethered)
====================================================
  tenant   : enit
  station  : 6f7e21...-...-...
  broker   : 192.168.1.42:1883
  topic    : tenants/enit/stations/6f7e21.../readings
  cadence  : every 300 seconds
----------------------------------------------------
[bme280] ok @ 0x76
[bh1750] ok @ 0x23
[wifi] connecting to 'your-wifi-ssid'…
.....
[wifi] connected · ip=192.168.1.97 · rssi=-58dBm
[time] synced · epoch=1748520600 · iso=2026-05-29T13:30:00Z
[mqtt] connecting to 192.168.1.42:1883 as 'wh-esp32-...' …
[mqtt] connected
[publish #1] tenants/enit/stations/.../readings (412 B)
{"token":"eyJ...","reading":{"recordedAt":"...","temperatureC":22.81,...}}
```

Open <http://localhost:3000/dashboard> and the first reading should appear within a few seconds.

---

## 3. Using the simulator instead (no hardware needed)

```sh
cd firmware/simulator
pip install -r requirements.txt

# One-shot publish
python publish.py --once \
  --host=localhost --tenant=enit \
  --station=<the-uuid> \
  --token=<the-jwt>

# Continuous, every 5 seconds, until Ctrl-C
python publish.py --interval=5 \
  --host=localhost --tenant=enit \
  --station=<the-uuid> \
  --token=<the-jwt>
```

You can also set everything via env so the command stays terse:

```sh
export WH_MQTT_HOST=localhost
export WH_TENANT_SLUG=enit
export WH_STATION_ID=<uuid>
export WH_DEVICE_JWT=<jwt>
python publish.py --interval=5
```

The simulator generates a noisy daily sinusoid for temperature + humidity so the dashboard charts have plausible shape.

---

## 4. Verifying the round-trip

After publishing a reading:

```sh
# Backend log shows the ingest hit
docker compose logs backend --tail=20 | grep readings

# Tenant DB has the row
docker compose exec timescaledb \
  psql -U weatherhub -d tenant_enit \
  -c "SELECT \"recordedAt\", \"temperatureC\", \"humidityPct\" FROM readings ORDER BY \"recordedAt\" DESC LIMIT 5;"
```

And the dashboard at <http://localhost:3000/dashboard> shows the latest values + sparkline update.

---

## 5. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `[wifi] connect failed` after 30s | wrong SSID/password OR 5GHz-only WiFi | ESP32 is 2.4GHz only; check your router has a 2.4GHz SSID exposed |
| `[mqtt] connect failed · state=-2` | host unreachable (often `localhost` from the ESP32's perspective) | use your computer's LAN IP (e.g. `192.168.1.x`), not `localhost` |
| `[mqtt] connect failed · state=5` | bad creds | match `WH_MQTT_USER`/`PASS` to whatever docker compose set; default is `ingest-worker`/`ingest-worker` |
| `[bme280] NOT FOUND at 0x76` | wrong I²C address OR bad wiring | try `0x77` in config.h; check SDA/SCL aren't swapped |
| Backend rejects with `invalid_device_token` | JWT expired or signed with a different secret | re-run `device:provision`; make sure `DEVICE_JWT_SECRET` matches between the running backend and the host where you minted the token |
| Backend rejects with `cross_tenant_denied` | the JWT was minted for a different tenant than what's in the topic | check `WH_TENANT_SLUG` in config.h matches the slug you passed to `device:provision` |
| Backend rejects with `cross_station_denied` | wrong station UUID in topic | check `WH_STATION_ID` matches the station the JWT was minted for |
| Publish 200 but nothing in dashboard | tenant resolver miss on the SSE endpoint | open the browser console; check the `EventSource` URL has the right host (subdomain or `X-Tenant`) |

---

## 6. What this firmware does NOT do (yet)

Documented so you don't trip on the gaps:

- **Deep sleep.** This is the tethered/USB-C prototype. When you move to battery + solar (Phase 2 in the BOM), the loop pattern changes — connect, publish, deep-sleep for the cadence interval, wake.
- **Rain gauge.** Wiring is documented in the BOM but the firmware doesn't poll a reed switch yet. Add a GPIO ISR + RTC-kept counter when you're ready.
- **OTA updates.** Right now you reflash over USB. ArduinoOTA / ESP-IDF OTA is a 30-line add when you start putting boxes on roofs.
- **TLS.** Plain MQTT on port 1883 — fine for a LAN prototype, NOT for the public internet. Switch the broker config to TLS + add a CA cert when you go outdoor.
- **Local buffering on WiFi loss.** Today: drops the reading. Add a small ring buffer in RTC memory if your link is flaky.
