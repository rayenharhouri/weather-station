/*
 * WeatherHub ESP32-S3 — BME280 + BH1750 combined test.
 *
 * Both sensors share the external I2C bus (Wire1) — this builds directly
 * on the BME280-only test by adding the lux sensor onto the same two
 * wires. Still no OLED, no rain gauge, no WiFi.
 *
 * Wiring (per the WeatherHub wiring schema — see sanity.cpp):
 *
 *   Shared bus:
 *     3V3     -> BME280 VCC, BME280 CS, BH1750 VCC
 *     GND     -> BME280 GND, BME280 ADDR, BH1750 GND
 *     GPIO 41 -> BME280 SDA, BH1750 SDA
 *     GPIO 42 -> BME280 SCL, BH1750 SCL
 *
 *   BME280 ADDR -> GND       selects 0x76
 *   BH1750 ADDR -> floating  selects 0x23 (tie to 3V3 for 0x5C instead)
 *
 *   pio run -e bme-bh1750-test -t upload
 *   pio device monitor
 */

#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_BME280.h>
#include <BH1750.h>

// ─── Pinout — external sensor bus (Wire1), matches sanity.cpp ──────
static constexpr uint8_t SENSOR_SDA = 41;
static constexpr uint8_t SENSOR_SCL = 42;
static constexpr uint32_t SENSOR_I2C_HZ = 100000;   // 100 kHz, safest

static constexpr uint8_t BME280_ADDR_PRIMARY   = 0x76;
static constexpr uint8_t BME280_ADDR_ALTERNATE = 0x77;
static constexpr uint8_t BH1750_ADDR_PRIMARY   = 0x23;
static constexpr uint8_t BH1750_ADDR_ALTERNATE = 0x5C;

Adafruit_BME280 bme;
BH1750          lux;

bool    bmeOk   = false;
bool    luxOk   = false;
uint8_t bmeAddr = 0;
uint8_t luxAddr = 0;

static bool tryBme280() {
  if (bme.begin(BME280_ADDR_PRIMARY, &Wire1)) {
    bmeAddr = BME280_ADDR_PRIMARY;
    return true;
  }
  if (bme.begin(BME280_ADDR_ALTERNATE, &Wire1)) {
    bmeAddr = BME280_ADDR_ALTERNATE;
    return true;
  }
  return false;
}

static bool tryBh1750() {
  if (lux.begin(BH1750::CONTINUOUS_HIGH_RES_MODE, BH1750_ADDR_PRIMARY, &Wire1)) {
    luxAddr = BH1750_ADDR_PRIMARY;
    return true;
  }
  if (lux.begin(BH1750::CONTINUOUS_HIGH_RES_MODE, BH1750_ADDR_ALTERNATE, &Wire1)) {
    luxAddr = BH1750_ADDR_ALTERNATE;
    return true;
  }
  return false;
}

// Walks every 7-bit I2C address — with both sensors wired correctly this
// should report exactly 2 devices (0x76 + 0x23). One missing means that
// sensor's wiring, not the driver, is the problem.
static void scanBus() {
  Serial.print("[i2c] scanning Wire1... ");
  uint8_t found = 0;
  for (uint8_t addr = 1; addr < 127; addr++) {
    Wire1.beginTransmission(addr);
    if (Wire1.endTransmission() == 0) {
      Serial.printf("0x%02X ", addr);
      found++;
    }
  }
  Serial.printf("(%u device(s))\n", found);
  if (found == 0) {
    Serial.println("  -> nothing ACK'd. Check VCC/GND/SDA/SCL on both sensors.");
  }
}

void setup() {
  Serial.begin(115200);
  delay(800);   // let USB-CDC enumerate before we start printing

  Serial.println();
  Serial.println("=====================================");
  Serial.println("  BME280 + BH1750 combined test");
  Serial.println("=====================================");
  Serial.printf("  Sensor bus: Wire1 (SDA=%u, SCL=%u, %lu Hz)\n",
                SENSOR_SDA, SENSOR_SCL, (unsigned long)SENSOR_I2C_HZ);
  Serial.println("-------------------------------------");

  if (!Wire1.begin(SENSOR_SDA, SENSOR_SCL, SENSOR_I2C_HZ)) {
    Serial.println("[wire1] FAILED to start I2C peripheral");
  }

  scanBus();

  Serial.print("[bme280] begin... ");
  bmeOk = tryBme280();
  if (bmeOk) {
    Serial.printf("OK @ 0x%02X\n", bmeAddr);
    bme.setSampling(Adafruit_BME280::MODE_NORMAL,
                    Adafruit_BME280::SAMPLING_X1,
                    Adafruit_BME280::SAMPLING_X1,
                    Adafruit_BME280::SAMPLING_X1,
                    Adafruit_BME280::FILTER_OFF,
                    Adafruit_BME280::STANDBY_MS_1000);
  } else {
    Serial.println("NOT FOUND");
  }

  Serial.print("[bh1750] begin... ");
  luxOk = tryBh1750();
  if (luxOk) {
    Serial.printf("OK @ 0x%02X\n", luxAddr);
  } else {
    Serial.println("NOT FOUND");
  }
  Serial.println("-------------------------------------");
}

void loop() {
  if (!bmeOk) {
    Serial.print("[bme280] retry... ");
    bmeOk = tryBme280();
    Serial.println(bmeOk ? "recovered" : "still missing");
  }
  if (!luxOk) {
    Serial.print("[bh1750] retry... ");
    luxOk = tryBh1750();
    Serial.println(luxOk ? "recovered" : "still missing");
  }

  float t = NAN, h = NAN, p = NAN, l = NAN;

  if (bmeOk) {
    t = bme.readTemperature();
    h = bme.readHumidity();
    p = bme.readPressure() / 100.0f;   // Pa -> hPa
    if (isnan(t) || isnan(h) || isnan(p)) {
      Serial.println("[bme280] read returned NaN — sensor may have dropped off");
      bmeOk = false;
    }
  }

  if (luxOk) {
    l = lux.readLightLevel();
    if (l < 0 || isnan(l)) {
      Serial.println("[bh1750] read failed");
      luxOk = false;
    }
  }

  Serial.printf("T=%6.2fC  H=%5.2f%%  P=%7.2fhPa  L=%7.0flx\n", t, h, p, l);
  delay(1000);
}
