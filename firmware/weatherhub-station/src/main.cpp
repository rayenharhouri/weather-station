
#include <Arduino.h>
#include <Wire.h>
#include <WiFi.h>
#include <time.h>
#include <math.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <Adafruit_BME280.h>
#include <BH1750.h>
#include <U8g2lib.h>

#if __has_include("config.h")
#include "config.h"
#else
#error "Copy src/config.example.h to src/config.h and fill in your WiFi / MQTT / tenant / station / JWT values before building."
#endif

static const char* NTP_SERVER1 = "pool.ntp.org";
static const char* NTP_SERVER2 = "time.google.com";
static const uint16_t MQTT_BUFFER_BYTES = 1024;
static const uint32_t WIFI_TIMEOUT_MS   = 30000;
static const uint32_t NTP_TIMEOUT_MS    = 15000;
static const time_t   NTP_VALID_EPOCH   = 1700000000UL;

static const uint8_t  SENSOR_SDA    = 41;
static const uint8_t  SENSOR_SCL    = 42;
static const uint32_t SENSOR_I2C_HZ = 100000;

static constexpr uint8_t  OLED_SDA  = 17;
static constexpr uint8_t  OLED_SCL  = 18;
static constexpr uint8_t  OLED_RST  = 21;
static constexpr uint8_t  OLED_VEXT = 36;
static constexpr uint32_t DISPLAY_INTERVAL_MS = 1000;

WiFiClient        wifi;
PubSubClient      mqtt(wifi);
Adafruit_BME280   bme;
BH1750            lux;
U8G2_SSD1306_128X64_NONAME_F_HW_I2C oled(
    U8G2_R0,
    OLED_RST,
    OLED_SCL,
    OLED_SDA);

bool          bmeOk         = false;
bool          luxOk         = false;
bool          timeOk        = false;
uint32_t      lastPublishMs = 0;
uint32_t      lastDisplayMs = 0;
uint32_t      publishCount  = 0;
float         lastRainfallMm = 0.0f;

static float round2(float v) {
  return roundf(v * 100.0f) / 100.0f;
}

static float simulatedRainfallMm() {
  if (random(0, 100) < 5) {
    return round2(random(0, 150) / 100.0f);
  }
  return 0.0f;
}

static int simulatedLightLux() {
  time_t now = time(nullptr);
  float hour = 12.0f;
  if (now >= NTP_VALID_EPOCH) {
    struct tm tm_utc;
    gmtime_r(&now, &tm_utc);
    hour = tm_utc.tm_hour + tm_utc.tm_min / 60.0f;
  }
  float curve = sinf((hour - 6.0f) * PI / 13.0f);
  if (curve < 0) curve = 0;
  float lux = 80000.0f * curve + (float)random(-4000, 4000);
  if (lux < 0) lux = 0;
  return (int)lux;
}

static String topicFromConfig() {
  String t = "tenants/";
  t += WH_TENANT_SLUG;
  t += "/stations/";
  t += WH_STATION_ID;
  t += "/readings";
  return t;
}

static String isoNow() {
  time_t now = time(nullptr);
  if (now < NTP_VALID_EPOCH) {
    char buf[32];
    snprintf(buf, sizeof(buf), "1970-01-01T00:00:%02luZ",
             (unsigned long)(now % 60));
    return String(buf);
  }
  struct tm tm_utc;
  gmtime_r(&now, &tm_utc);
  char buf[24];
  strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%SZ", &tm_utc);
  return String(buf);
}

static void connectWiFi() {
  Serial.printf("[wifi] connecting to '%s'…\n", WH_WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);
  WiFi.begin(WH_WIFI_SSID, WH_WIFI_PASSWORD);

  uint32_t startedAt = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startedAt < WIFI_TIMEOUT_MS) {
    delay(500);
    Serial.print('.');
  }
  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("[wifi] connected · ip=%s · rssi=%ddBm\n",
                  WiFi.localIP().toString().c_str(), WiFi.RSSI());
  } else {
    Serial.println("[wifi] connect failed — will retry on next loop pass");
  }
}

static void syncTime() {
  Serial.println("[time] syncing via NTP…");
  configTime(0, 0, NTP_SERVER1, NTP_SERVER2);
  uint32_t startedAt = millis();
  time_t now = time(nullptr);
  while (now < NTP_VALID_EPOCH && millis() - startedAt < NTP_TIMEOUT_MS) {
    delay(200);
    now = time(nullptr);
  }
  if (now >= NTP_VALID_EPOCH) {
    timeOk = true;
    Serial.printf("[time] synced · epoch=%lu · iso=%s\n",
                  (unsigned long)now, isoNow().c_str());
  } else {
    Serial.println("[time] sync failed — recordedAt will reflect uptime, not wall-clock");
  }
}

static void connectMqtt() {
  mqtt.setServer(WH_MQTT_HOST, WH_MQTT_PORT);
  mqtt.setBufferSize(MQTT_BUFFER_BYTES);
  mqtt.setKeepAlive(60);

  String clientId = "wh-esp32-";
  clientId += WH_STATION_ID;

  Serial.printf("[mqtt] connecting to %s:%u as '%s' …\n",
                WH_MQTT_HOST, (unsigned)WH_MQTT_PORT, clientId.c_str());

  bool ok;
  if (strlen(WH_MQTT_USER) > 0) {
    ok = mqtt.connect(clientId.c_str(), WH_MQTT_USER, WH_MQTT_PASS);
  } else {
    ok = mqtt.connect(clientId.c_str());
  }
  if (ok) {
    Serial.println("[mqtt] connected");
  } else {
    Serial.printf("[mqtt] connect failed · state=%d\n", mqtt.state());
  }
}

static bool tryBme280() {
  if (!bme.begin(WH_BME280_ADDR, &Wire1)) return false;
  bme.setSampling(Adafruit_BME280::MODE_NORMAL,
                  Adafruit_BME280::SAMPLING_X1,
                  Adafruit_BME280::SAMPLING_X1,
                  Adafruit_BME280::SAMPLING_X1,
                  Adafruit_BME280::FILTER_OFF,
                  Adafruit_BME280::STANDBY_MS_1000);
  return true;
}

static bool tryBh1750() {
  return lux.begin(BH1750::CONTINUOUS_HIGH_RES_MODE, WH_BH1750_ADDR, &Wire1);
}

static void initSensors() {
  Wire1.begin(SENSOR_SDA, SENSOR_SCL, SENSOR_I2C_HZ);

  bmeOk = tryBme280();
  if (bmeOk) {
    Serial.printf("[bme280] ok @ 0x%02X\n", WH_BME280_ADDR);
  } else {
    Serial.printf("[bme280] NOT FOUND at 0x%02X — check wiring + address\n",
                  WH_BME280_ADDR);
  }

  luxOk = false;
}

static void initDisplay() {
  pinMode(OLED_VEXT, OUTPUT);
  digitalWrite(OLED_VEXT, LOW);
  delay(50);
  oled.begin();
  oled.setContrast(255);
  oled.clearBuffer();
  oled.setFont(u8g2_font_5x7_tf);
  oled.drawStr(0, 7, "WeatherHub");
  oled.drawStr(0, 20, "booting...");
  oled.sendBuffer();
}

static void renderScreen(float t, float h, float p, float l) {
  oled.clearBuffer();
  oled.setFont(u8g2_font_5x7_tf);

  char line[48];

  snprintf(line, sizeof(line), "WeatherHub  %s", WH_TENANT_SLUG);
  oled.drawStr(0, 7, line);
  oled.drawHLine(0, 9, 128);

  snprintf(line, sizeof(line), "WiFi:%s MQTT:%s  pub#%lu",
           WiFi.status() == WL_CONNECTED ? "OK" : "--",
           mqtt.connected() ? "OK" : "--",
           (unsigned long)publishCount);
  oled.drawStr(0, 18, line);

  if (bmeOk && !isnan(t) && !isnan(h)) {
    snprintf(line, sizeof(line), "T %4.1fC  H %4.1f%%", t, h);
  } else {
    snprintf(line, sizeof(line), "T  --.-C H  --.-%%");
  }
  oled.drawStr(0, 27, line);

  if (bmeOk && !isnan(p)) {
    snprintf(line, sizeof(line), "P %6.1f hPa", p);
  } else {
    snprintf(line, sizeof(line), "P  ----.- hPa");
  }
  oled.drawStr(0, 36, line);

  snprintf(line, sizeof(line), "L %6.0f lux (sim)", l);
  oled.drawStr(0, 45, line);

  snprintf(line, sizeof(line), "Rain %4.2fmm (sim)", lastRainfallMm);
  oled.drawStr(0, 54, line);

  uint32_t sec = millis() / 1000;
  uint32_t freeKb = ESP.getFreeHeap() / 1024;
  snprintf(line, sizeof(line), "up %lu:%02lu  heap %luk",
           (unsigned long)(sec / 60), (unsigned long)(sec % 60),
           (unsigned long)freeKb);
  oled.drawStr(0, 63, line);

  oled.sendBuffer();
}

static void publishReading() {
  JsonDocument doc;
  doc["token"] = WH_DEVICE_JWT;
  JsonObject reading = doc["reading"].to<JsonObject>();
  reading["recordedAt"] = isoNow();

  if (bmeOk) {
    float t = bme.readTemperature();
    float h = bme.readHumidity();
    float p = bme.readPressure() / 100.0f;
    if (!isnan(t)) reading["temperatureC"] = round2(t);
    if (!isnan(h)) reading["humidityPct"]  = round2(h);
    if (!isnan(p)) reading["pressureHpa"]  = round2(p);
  }

  reading["lightLux"] = simulatedLightLux();

  lastRainfallMm = simulatedRainfallMm();
  reading["rainfallMm"] = lastRainfallMm;

  if (WiFi.status() == WL_CONNECTED) {
    reading["signalRssi"] = WiFi.RSSI();
  }

  String topic = topicFromConfig();
  String body;
  serializeJson(doc, body);

  Serial.printf("[publish #%lu] %s (%u B)\n",
                (unsigned long)++publishCount,
                topic.c_str(), (unsigned)body.length());
  Serial.println(body);

  bool ok = mqtt.publish(topic.c_str(), body.c_str(),false);
  if (!ok) {
    Serial.printf("[publish] FAILED · mqtt.state=%d · wifi=%d\n",
                  mqtt.state(), WiFi.status());
  }
}

void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println();
  Serial.println("====================================================");
  Serial.println("  WeatherHub ESP32 station — Phase 1 (tethered)");
  Serial.println("====================================================");
  Serial.printf("  tenant   : %s\n", WH_TENANT_SLUG);
  Serial.printf("  station  : %s\n", WH_STATION_ID);
  Serial.printf("  broker   : %s:%u\n", WH_MQTT_HOST, (unsigned)WH_MQTT_PORT);
  Serial.printf("  topic    : %s\n", topicFromConfig().c_str());
  Serial.printf("  cadence  : every %lu seconds\n",
                (unsigned long)(WH_PUBLISH_INTERVAL_MS / 1000UL));
  Serial.println("----------------------------------------------------");

  initDisplay();
  initSensors();
  connectWiFi();
  if (WiFi.status() == WL_CONNECTED) {
    syncTime();
    connectMqtt();
  }
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
    if (WiFi.status() == WL_CONNECTED) {
      if (!timeOk) syncTime();
    }
  }

  if (WiFi.status() == WL_CONNECTED && !mqtt.connected()) {
    connectMqtt();
  }

  mqtt.loop();

  uint32_t now = millis();

  if (now - lastDisplayMs >= DISPLAY_INTERVAL_MS) {
    lastDisplayMs = now;

    if (!bmeOk) {
      bmeOk = tryBme280();
      if (bmeOk) Serial.printf("[bme280] recovered @ 0x%02X\n", WH_BME280_ADDR);
    }

    float t = NAN, h = NAN, p = NAN;
    if (bmeOk) {
      t = bme.readTemperature();
      h = bme.readHumidity();
      p = bme.readPressure() / 100.0f;
    }
    renderScreen(t, h, p, (float)simulatedLightLux());
  }

  uint32_t dueAt = lastPublishMs == 0 ? 3000UL : lastPublishMs + WH_PUBLISH_INTERVAL_MS;
  if (now >= dueAt && mqtt.connected()) {
    publishReading();
    lastPublishMs = now;
  }

  delay(50);
}
