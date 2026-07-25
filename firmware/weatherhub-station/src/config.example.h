/*
 * WeatherHub ESP32 — local config.
 *
 * Copy this file to `config.h` (already in .gitignore) and fill in the
 * values for your environment. The sketch will refuse to build if
 * `config.h` is missing.
 */

#pragma once

// ─── WiFi ──────────────────────────────────────────────────────────
#define WH_WIFI_SSID      "your-wifi-ssid"
#define WH_WIFI_PASSWORD  "your-wifi-password"

// ─── MQTT broker ───────────────────────────────────────────────────
// Point this at whatever host runs your docker-compose stack. From the
// ESP32's perspective, `localhost` won't work — use your computer's
// LAN IP (e.g. 192.168.1.42 — find it with `ip addr` / `ifconfig`).
#define WH_MQTT_HOST      "192.168.1.42"
#define WH_MQTT_PORT      1883
#define WH_MQTT_USER      "ingest-worker"
#define WH_MQTT_PASS      "ingest-worker"

// ─── Tenant + station identity ─────────────────────────────────────
// `WH_TENANT_SLUG` matches the slug you passed to `tenant:provision`.
// `WH_STATION_ID` is the UUID of the row in the tenant's `stations` table —
// find it on the dashboard's /stations page or via:
//
//   docker compose exec timescaledb \
//     psql -U weatherhub -d tenant_<slug> -c \
//     "SELECT id, name FROM stations;"
#define WH_TENANT_SLUG    "enit"
#define WH_STATION_ID     "11111111-2222-3333-4444-555555555555"

// ─── Device JWT ────────────────────────────────────────────────────
// Mint with:
//
//   docker compose exec backend node \
//     dist/database/scripts/device-provision.js \
//     --tenant=<slug> --station=<uuid> [--device-id=<label>]
//
// Paste the printed token here. It's ~250 bytes and valid for 365 days
// by default.
#define WH_DEVICE_JWT     "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.PASTE_HERE"

// ─── Publish cadence ───────────────────────────────────────────────
// Default: every 5 minutes. The operations dashboard's SSE auto-refresh
// is geared around this cadence.
#define WH_PUBLISH_INTERVAL_MS  (5UL * 60UL * 1000UL)

// ─── Sensor I²C addresses (rarely changed) ─────────────────────────
// Bus pins themselves (Wire1, GPIO 41/42) are NOT configurable here —
// they're a fixed wiring trait of this board (Heltec WiFi Kit 32 V3 /
// HiLetgo ESP32-S3 OLED kit), hardcoded in main.cpp to match sanity.cpp.
#define WH_BME280_ADDR    0x76   // some boards strap to 0x77
#define WH_BH1750_ADDR    0x23   // some boards strap to 0x5C
