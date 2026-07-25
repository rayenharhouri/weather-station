/*
 * WeatherHub ESP32-S3 — BME280 standalone test.
 *
 * Isolates just the BME280 on the external sensor bus so a failure can
 * only mean wiring / address strapping / a dead sensor — nothing else
 * (BH1750, rain gauge, OLED, WiFi) is in the loop yet.
 *
 * Wiring (per the WeatherHub wiring schema — see sanity.cpp):
 *
 *   BME280 VCC  -> 3V3
 *   BME280 GND  -> GND
 *   BME280 SDA  -> GPIO 41
 *   BME280 SCL  -> GPIO 42
 *   BME280 CS   -> 3V3   (forces I2C mode instead of SPI)
 *   BME280 ADDR -> GND   (selects 0x76; float or tie to 3V3 for 0x77)
 *
 *   pio run -e bme-test -t upload
 *   pio device monitor
 */

#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_BME280.h>

// ─── Pinout — external sensor bus (Wire1), matches sanity.cpp ──────
static constexpr uint8_t SENSOR_SDA = 41;
static constexpr uint8_t SENSOR_SCL = 42;
static constexpr uint32_t SENSOR_I2C_HZ = 100000;   // 100 kHz, safest

static constexpr uint8_t BME280_ADDR_PRIMARY   = 0x76;
static constexpr uint8_t BME280_ADDR_ALTERNATE = 0x77;

Adafruit_BME280 bme;
bool bmeOk = false;
uint8_t bmeAddr = 0;

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

// Walks every 7-bit I2C address so a wiring problem is obvious before we
// even try the BME280 driver — if this finds nothing, don't bother
// debugging the driver, go check SDA/SCL/VCC/GND first.
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
    Serial.println("  -> nothing ACK'd. Check VCC/GND first, then SDA/SCL,");
    Serial.println("     then confirm CS is tied to 3V3 (not floating/SPI mode).");
  }
}

void setup() {
  Serial.begin(115200);
  delay(800);   // let USB-CDC enumerate before we start printing

  Serial.println();
  Serial.println("=====================================");
  Serial.println("  BME280 standalone test");
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
    // "Weather monitoring" preset from the Bosch datasheet: long-term
    // average, low power, no filtering.
    bme.setSampling(Adafruit_BME280::MODE_NORMAL,
                    Adafruit_BME280::SAMPLING_X1,
                    Adafruit_BME280::SAMPLING_X1,
                    Adafruit_BME280::SAMPLING_X1,
                    Adafruit_BME280::FILTER_OFF,
                    Adafruit_BME280::STANDBY_MS_1000);
  } else {
    Serial.println("NOT FOUND");
    Serial.println("  -> if the scan above found a device at 0x76/0x77, the");
    Serial.println("     driver should have worked — check ADDR strapping.");
    Serial.println("  -> if the scan found nothing, it's a wiring problem,");
    Serial.println("     not a code problem.");
  }
  Serial.println("-------------------------------------");
}

void loop() {
  if (!bmeOk) {
    delay(2000);
    Serial.print("[bme280] retry... ");
    bmeOk = tryBme280();
    Serial.println(bmeOk ? "recovered" : "still missing");
    return;
  }

  float t = bme.readTemperature();
  float h = bme.readHumidity();
  float p = bme.readPressure() / 100.0f;   // Pa -> hPa

  if (isnan(t) || isnan(h) || isnan(p)) {
    Serial.println("[bme280] read returned NaN — sensor may have dropped off");
    bmeOk = false;
  } else {
    Serial.printf("T=%6.2fC  H=%5.2f%%  P=%7.2fhPa\n", t, h, p);
  }

  delay(1000);
}
