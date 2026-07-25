/*
 * LIGHTENCY ESP32-S3 — sensor sanity check.
 *
 * Boots the onboard OLED, scans the external I²C bus, probes every
 * sensor the wiring schema expects, and watches the rain-gauge GPIO.
 * Live status grid on the screen + verbose dump to Serial at 115200.
 * No WiFi, no MQTT — just hardware diagnostics.
 *
 *   pio run -e sanity -t upload
 *   pio device monitor
 *
 * Per the WeatherHub wiring schema:
 *
 *   OLED — internal (already routed on the dev board, do NOT wire):
 *     SDA   = GPIO 17    SCL   = GPIO 18
 *     RST   = GPIO 21    VEXT  = GPIO 36   (active-LOW power gate)
 *
 *   External sensors (Wire1):
 *     SDA   = GPIO 41    SCL   = GPIO 42
 *     BME280 @ 0x76  (CS→3V3 enables I²C, ADDR→GND selects 0x76)
 *     BH1750 @ 0x23  (ADDR open)
 *
 *   Rain gauge (reed-switch contact closure):
 *     GPIO 5  (INPUT_PULLUP; closure pulls LOW, FALLING-edge ISR
 *              increments a counter)
 *
 * Manual rain-gauge test without the actual gauge: jump a wire briefly
 * between GPIO 5 and GND. Each clean contact should bump the tip counter
 * by 1 (plus or minus a few from contact bounce — that's why we debounce).
 */

#include <Arduino.h>
#include <Wire.h>
#include <U8g2lib.h>
#include <Adafruit_BME280.h>
#include <BH1750.h>

// ─── Pinout ────────────────────────────────────────────────────────
// OLED — on the primary I²C bus (Wire).
static constexpr uint8_t OLED_SDA = 17;
static constexpr uint8_t OLED_SCL = 18;
static constexpr uint8_t OLED_RST = 21;
static constexpr uint8_t OLED_VEXT = 36;     // active-LOW

// External sensors — on the secondary I²C bus (Wire1).
static constexpr uint8_t SENSOR_SDA = 41;
static constexpr uint8_t SENSOR_SCL = 42;
static constexpr uint32_t SENSOR_I2C_HZ = 100000;   // 100 kHz, safest

// Sensor I²C addresses.
static constexpr uint8_t BME280_ADDR_PRIMARY   = 0x76;
static constexpr uint8_t BME280_ADDR_ALTERNATE = 0x77;
static constexpr uint8_t BH1750_ADDR_PRIMARY   = 0x23;
static constexpr uint8_t BH1750_ADDR_ALTERNATE = 0x5C;

// Rain gauge — reed switch contact closure on this pin.
static constexpr uint8_t RAIN_GPIO = 5;
static constexpr uint32_t RAIN_DEBOUNCE_US = 50000;   // 50 ms

// ─── Hardware handles ──────────────────────────────────────────────
U8G2_SSD1306_128X64_NONAME_F_HW_I2C oled(
    U8G2_R0,
    /* reset = */ OLED_RST,
    /* clock = */ OLED_SCL,
    /* data  = */ OLED_SDA);

Adafruit_BME280 bme;
BH1750          lux;

// ─── State ─────────────────────────────────────────────────────────
enum class SensorState : uint8_t { Missing, Ok, Error };
static SensorState bmeState   = SensorState::Missing;
static SensorState bh1750State = SensorState::Missing;
static uint8_t     bmeAddr    = 0;
static uint8_t     bh1750Addr = 0;

// Per-bus device counts. Wire is the OLED bus (should always have 1 = 0x3C
// for the SSD1306); Wire1 is the external sensor bus (should have 2 when
// BME280 + BH1750 are present).
static uint8_t wireDeviceCount  = 0;
static uint8_t wire1DeviceCount = 0;

static volatile uint32_t rainTips        = 0;
static volatile uint32_t lastRainTipUs   = 0;

static uint32_t lastSerialMs = 0;
static uint32_t lastOledMs   = 0;
static uint32_t lastScanMs   = 0;

// ─── ISR: rain tip ─────────────────────────────────────────────────
// Tightly debounced so reed-switch bounce doesn't quadruple-count.
void IRAM_ATTR onRainTip() {
  const uint32_t now = micros();
  if (now - lastRainTipUs < RAIN_DEBOUNCE_US) return;
  lastRainTipUs = now;
  rainTips++;
}

// ─── I²C scanner ───────────────────────────────────────────────────
// Walks every 7-bit address on the bus, returns count of devices that
// ACK'd. Writes each ACK'd address into `out` (up to outCap).
static uint8_t scanI2C(TwoWire& bus, uint8_t* out, uint8_t outCap) {
  uint8_t count = 0;
  for (uint8_t addr = 1; addr < 127; addr++) {
    bus.beginTransmission(addr);
    uint8_t err = bus.endTransmission();
    if (err == 0) {
      if (count < outCap) out[count] = addr;
      count++;
    }
  }
  return count;
}

// ─── Sensor probe + init ───────────────────────────────────────────
static SensorState tryBme280() {
  if (bme.begin(BME280_ADDR_PRIMARY, &Wire1)) {
    bmeAddr = BME280_ADDR_PRIMARY;
  } else if (bme.begin(BME280_ADDR_ALTERNATE, &Wire1)) {
    bmeAddr = BME280_ADDR_ALTERNATE;
  } else {
    return SensorState::Missing;
  }
  // Weather monitoring preset from the datasheet (low power, 1 Hz).
  bme.setSampling(Adafruit_BME280::MODE_NORMAL,
                  Adafruit_BME280::SAMPLING_X1,
                  Adafruit_BME280::SAMPLING_X1,
                  Adafruit_BME280::SAMPLING_X1,
                  Adafruit_BME280::FILTER_OFF,
                  Adafruit_BME280::STANDBY_MS_1000);
  return SensorState::Ok;
}

static SensorState tryBh1750() {
  if (lux.begin(BH1750::CONTINUOUS_HIGH_RES_MODE, BH1750_ADDR_PRIMARY, &Wire1)) {
    bh1750Addr = BH1750_ADDR_PRIMARY;
    return SensorState::Ok;
  }
  if (lux.begin(BH1750::CONTINUOUS_HIGH_RES_MODE, BH1750_ADDR_ALTERNATE, &Wire1)) {
    bh1750Addr = BH1750_ADDR_ALTERNATE;
    return SensorState::Ok;
  }
  return SensorState::Missing;
}

// ─── Drawing ───────────────────────────────────────────────────────
static const char* stateGlyph(SensorState s) {
  switch (s) {
    case SensorState::Ok:      return "ok";
    case SensorState::Error:   return "ER";
    default:                   return "--";
  }
}

static void renderScreen(float t, float h, float p, float l, bool rainPin) {
  oled.clearBuffer();
  oled.setFont(u8g2_font_5x7_tf);

  // Title
  oled.drawStr(0, 7, "LIGHTENCY  sanity");
  oled.drawHLine(0, 9, 128);

  // Per-bus device counts + per-sensor status.
  // W0 = Wire (OLED bus; should show 1 — the SSD1306 at 0x3C).
  // W1 = Wire1 (external sensor bus; should show 2 — BME280 + BH1750).
  char line[48];
  snprintf(line, sizeof(line), "W0[%u] W1[%u] B:%s L:%s",
           (unsigned)wireDeviceCount,
           (unsigned)wire1DeviceCount,
           stateGlyph(bmeState),
           stateGlyph(bh1750State));
  oled.drawStr(0, 18, line);

  // BME280 readings (or dashes if missing)
  if (bmeState == SensorState::Ok && !isnan(t) && !isnan(h)) {
    snprintf(line, sizeof(line), "T %4.1fC  H %4.1f%%", t, h);
  } else {
    snprintf(line, sizeof(line), "T  --.-C H  --.-%%");
  }
  oled.drawStr(0, 27, line);

  if (bmeState == SensorState::Ok && !isnan(p)) {
    snprintf(line, sizeof(line), "P %6.1f hPa", p);
  } else {
    snprintf(line, sizeof(line), "P  ----.- hPa");
  }
  oled.drawStr(0, 36, line);

  // BH1750 reading
  if (bh1750State == SensorState::Ok && !isnan(l)) {
    snprintf(line, sizeof(line), "L %6.0f lux", l);
  } else {
    snprintf(line, sizeof(line), "L  ------ lux");
  }
  oled.drawStr(0, 45, line);

  // Rain tips + pin state
  snprintf(line, sizeof(line), "RAIN tips:%lu pin:%s",
           (unsigned long)rainTips, rainPin ? "HI" : "LO");
  oled.drawStr(0, 54, line);

  // Footer: uptime + free heap (KB)
  uint32_t sec = millis() / 1000;
  uint32_t freeKb = ESP.getFreeHeap() / 1024;
  snprintf(line, sizeof(line), "up %lu:%02lu  heap %luk",
           (unsigned long)(sec / 60), (unsigned long)(sec % 60),
           (unsigned long)freeKb);
  oled.drawStr(0, 63, line);

  oled.sendBuffer();
}

// ─── Serial logging ────────────────────────────────────────────────
static void logReadingLine(float t, float h, float p, float l, bool rainPin) {
  Serial.printf(
      "[t=%6lus] T=%6.2fC H=%5.2f%% P=%7.2fhPa  L=%7.0flx  rain tips=%lu pin=%s\n",
      (unsigned long)(millis() / 1000),
      t, h, p, l,
      (unsigned long)rainTips,
      rainPin ? "HIGH" : "LOW");
}

// Annotate well-known addresses so the scan output reads itself.
static const char* knownDevice(uint8_t addr) {
  switch (addr) {
    case 0x3C:                       return " (SSD1306 OLED)";
    case BME280_ADDR_PRIMARY:
    case BME280_ADDR_ALTERNATE:      return " (BME280?)";
    case BH1750_ADDR_PRIMARY:
    case BH1750_ADDR_ALTERNATE:      return " (BH1750?)";
    default:                          return "";
  }
}

static void logI2CScan() {
  uint8_t addrs[16];

  // Wire (the OLED bus on GPIO 17/18). We never call Wire.begin() ourselves —
  // U8g2's HW_I2C constructor did that for us in setup(). If this scan shows
  // 0x3C, the scan code + I²C peripheral are working; any failure on Wire1
  // is then specifically a Wire1 problem.
  wireDeviceCount = scanI2C(Wire, addrs, sizeof(addrs));
  Serial.printf("[i2c] Wire  scan (OLED bus, SDA=%u SCL=%u): %u device(s)",
                OLED_SDA, OLED_SCL, (unsigned)wireDeviceCount);
  for (uint8_t i = 0; i < wireDeviceCount && i < sizeof(addrs); i++) {
    Serial.printf(" 0x%02X%s", addrs[i], knownDevice(addrs[i]));
  }
  Serial.println();

  // Wire1 (the external sensor bus on GPIO 41/42). This is the one that
  // matters for BME280 + BH1750.
  wire1DeviceCount = scanI2C(Wire1, addrs, sizeof(addrs));
  Serial.printf("[i2c] Wire1 scan (sensor bus, SDA=%u SCL=%u @ %lu Hz): %u device(s)",
                SENSOR_SDA, SENSOR_SCL,
                (unsigned long)SENSOR_I2C_HZ, (unsigned)wire1DeviceCount);
  for (uint8_t i = 0; i < wire1DeviceCount && i < sizeof(addrs); i++) {
    Serial.printf(" 0x%02X%s", addrs[i], knownDevice(addrs[i]));
  }
  Serial.println();
}

// Read the raw idle state of the SDA + SCL pins BEFORE Wire1.begin()
// claims them. With external pull-ups present (every reputable sensor
// breakout has them), both pins should read HIGH even with no
// `INPUT_PULLUP` set. If they read LOW, something is shorting the line —
// most often a dead sensor module pulling SDA permanently to ground.
static void probePreInitBus() {
  pinMode(SENSOR_SDA, INPUT);
  pinMode(SENSOR_SCL, INPUT);
  delay(5);

  const bool sdaNoPull = digitalRead(SENSOR_SDA);
  const bool sclNoPull = digitalRead(SENSOR_SCL);

  pinMode(SENSOR_SDA, INPUT_PULLUP);
  pinMode(SENSOR_SCL, INPUT_PULLUP);
  delay(5);

  const bool sdaWithPull = digitalRead(SENSOR_SDA);
  const bool sclWithPull = digitalRead(SENSOR_SCL);

  Serial.printf("[bus probe] before Wire1.begin():\n");
  Serial.printf("  SDA (GPIO %u) idle: no-pull=%s  internal-pull-up=%s\n",
                SENSOR_SDA,
                sdaNoPull   ? "HIGH" : "LOW",
                sdaWithPull ? "HIGH" : "LOW");
  Serial.printf("  SCL (GPIO %u) idle: no-pull=%s  internal-pull-up=%s\n",
                SENSOR_SCL,
                sclNoPull   ? "HIGH" : "LOW",
                sclWithPull ? "HIGH" : "LOW");

  if (sdaNoPull && sclNoPull) {
    Serial.println("  → both lines HIGH with no pull-up: external pull-ups present, bus looks healthy.");
  } else if (sdaWithPull && sclWithPull) {
    Serial.println("  → lines HIGH only with internal pull-up: no external pull-ups detected.");
    Serial.println("    Sensor breakouts normally include them; if you see this with sensors");
    Serial.println("    plugged in, check that VCC actually reaches them.");
  } else {
    Serial.println("  → one or both lines stuck LOW: bad wiring, short to GND, or a dead device");
    Serial.println("    is pulling the line. Disconnect sensors one at a time to isolate.");
  }
}

// ─── Lifecycle ─────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(800);   // give USB-CDC host a moment to enumerate before printing

  Serial.println();
  Serial.println("===========================================");
  Serial.println("  LIGHTENCY ESP32-S3 — sanity check");
  Serial.println("===========================================");
  Serial.printf("  OLED bus  : Wire   (SDA=%u, SCL=%u, RST=%u, VEXT=%u)\n",
                OLED_SDA, OLED_SCL, OLED_RST, OLED_VEXT);
  Serial.printf("  Sensor bus: Wire1  (SDA=%u, SCL=%u, %lu Hz)\n",
                SENSOR_SDA, SENSOR_SCL, (unsigned long)SENSOR_I2C_HZ);
  Serial.printf("  Rain GPIO : %u (INPUT_PULLUP, FALLING-edge ISR, %lu us debounce)\n",
                RAIN_GPIO, (unsigned long)RAIN_DEBOUNCE_US);
  Serial.println("-------------------------------------------");

  // ── OLED power + bring-up ──
  pinMode(OLED_VEXT, OUTPUT);
  digitalWrite(OLED_VEXT, LOW);     // active-LOW: pull low to power OLED rail
  delay(50);
  oled.begin();
  oled.setContrast(255);
  oled.clearBuffer();
  oled.setFont(u8g2_font_5x7_tf);
  oled.drawStr(0, 7, "LIGHTENCY  sanity");
  oled.drawStr(0, 20, "booting...");
  oled.sendBuffer();

  // ── Pre-init bus probe ──
  // Look at the SDA/SCL pin levels *before* Wire1 grabs them. Tells us
  // whether external pull-ups exist and whether anything is shorting
  // the lines to ground.
  probePreInitBus();

  // ── External I²C bus ──
  if (!Wire1.begin(SENSOR_SDA, SENSOR_SCL, SENSOR_I2C_HZ)) {
    Serial.println("[wire1] FAILED to start I²C peripheral");
  } else {
    Serial.println("[wire1] up");
  }

  // ── First dual-bus scan ──
  logI2CScan();

  // ── Probe sensors ──
  Serial.print("[bme280] begin... ");
  bmeState = tryBme280();
  if (bmeState == SensorState::Ok) {
    Serial.printf("OK @ 0x%02X\n", bmeAddr);
  } else {
    Serial.println("NOT FOUND");
  }

  Serial.print("[bh1750] begin... ");
  bh1750State = tryBh1750();
  if (bh1750State == SensorState::Ok) {
    Serial.printf("OK @ 0x%02X\n", bh1750Addr);
  } else {
    Serial.println("NOT FOUND");
  }

  // ── Rain switch ──
  pinMode(RAIN_GPIO, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(RAIN_GPIO), onRainTip, FALLING);
  Serial.printf("[rain] GPIO %u watching for FALLING (current state: %s)\n",
                RAIN_GPIO, digitalRead(RAIN_GPIO) ? "HIGH" : "LOW");

  Serial.println("-------------------------------------------");
  Serial.println("[setup] ready · loop logging every 1s, I²C re-scan every 10s");
  Serial.println("-------------------------------------------");
}

void loop() {
  const uint32_t now = millis();

  // ── 1-second cadence: read + render + log ──
  if (now - lastSerialMs >= 1000) {
    lastSerialMs = now;
    lastOledMs   = now;

    float t = NAN, h = NAN, p = NAN, l = NAN;
    if (bmeState == SensorState::Ok) {
      t = bme.readTemperature();
      h = bme.readHumidity();
      p = bme.readPressure() / 100.0f;   // Pa → hPa
      if (isnan(t) || isnan(h) || isnan(p)) {
        bmeState = SensorState::Error;
        Serial.println("[bme280] read returned NaN — sensor may have dropped off");
      }
    }
    if (bh1750State == SensorState::Ok) {
      l = lux.readLightLevel();
      if (l < 0 || isnan(l)) {
        bh1750State = SensorState::Error;
        Serial.println("[bh1750] read failed");
      }
    }
    const bool rainPin = digitalRead(RAIN_GPIO);

    logReadingLine(t, h, p, l, rainPin);
    renderScreen(t, h, p, l, rainPin);
  }

  // ── 10-second cadence: re-scan I²C so a sensor coming/going is visible ──
  if (now - lastScanMs >= 10000) {
    lastScanMs = now;
    logI2CScan();

    // If a sensor went into ERROR but the I²C address is still ack'ing,
    // try to bring it back. Cheap recovery for transient glitches.
    if (bmeState != SensorState::Ok) {
      SensorState next = tryBme280();
      if (next == SensorState::Ok && bmeState != SensorState::Ok) {
        Serial.printf("[bme280] recovered @ 0x%02X\n", bmeAddr);
      }
      bmeState = next;
    }
    if (bh1750State != SensorState::Ok) {
      SensorState next = tryBh1750();
      if (next == SensorState::Ok && bh1750State != SensorState::Ok) {
        Serial.printf("[bh1750] recovered @ 0x%02X\n", bh1750Addr);
      }
      bh1750State = next;
    }
  }

  delay(20);
}
