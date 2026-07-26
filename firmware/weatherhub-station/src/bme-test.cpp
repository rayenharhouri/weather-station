
#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_BME280.h>

static constexpr uint8_t SENSOR_SDA = 41;
static constexpr uint8_t SENSOR_SCL = 42;
static constexpr uint32_t SENSOR_I2C_HZ = 100000;

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
  delay(800);

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
  float p = bme.readPressure() / 100.0f;

  if (isnan(t) || isnan(h) || isnan(p)) {
    Serial.println("[bme280] read returned NaN — sensor may have dropped off");
    bmeOk = false;
  } else {
    Serial.printf("T=%6.2fC  H=%5.2f%%  P=%7.2fhPa\n", t, h, p);
  }

  delay(1000);
}
