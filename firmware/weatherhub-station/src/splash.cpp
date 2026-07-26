
#include <Arduino.h>
#include <U8g2lib.h>

static constexpr uint8_t OLED_SDA = 17;
static constexpr uint8_t OLED_SCL = 18;
static constexpr uint8_t OLED_RST = 21;

#define HAS_VEXT_GATE
static constexpr uint8_t OLED_VEXT = 36;

U8G2_SSD1306_128X64_NONAME_F_HW_I2C oled(
    U8G2_R0,
    OLED_RST,
    OLED_SCL,
    OLED_SDA);

static uint32_t lastFrameMs = 0;
static uint16_t tick        = 0;

struct Sparkle { int8_t x, y; uint8_t phase; };
static Sparkle sparkles[] = {
  {  18,  6,  0  },
  { 109,  6,  12 },
};
static constexpr size_t SPARKLE_COUNT = sizeof(sparkles) / sizeof(sparkles[0]);

static int centerX(int textWidth) {
  return (128 - textWidth) / 2;
}

static void drawSparkles() {
  for (size_t i = 0; i < SPARKLE_COUNT; i++) {
    const Sparkle& s = sparkles[i];
    uint8_t p = (s.phase + tick) % 24;
    if (p < 9) continue;
    if (p < 17) {
      oled.drawPixel(s.x, s.y);
    } else {
      oled.drawPixel(s.x,     s.y);
      oled.drawPixel(s.x - 1, s.y);
      oled.drawPixel(s.x + 1, s.y);
      oled.drawPixel(s.x,     s.y - 1);
      oled.drawPixel(s.x,     s.y + 1);
    }
  }
}

static void drawLoadingDots(int16_t baseX, int16_t y) {
  uint8_t filled = (tick / 5) % 4;
  for (int i = 0; i < 3; i++) {
    int16_t cx = baseX + i * 6;
    if (i < filled) {
      oled.drawDisc(cx, y, 1);
    } else {
      oled.drawCircle(cx, y, 1);
    }
  }
}

static void drawLogo() {
  const int16_t cx       = 64;
  const int16_t dotY     = 7;
  const int16_t topY     = 13;
  const int16_t waistY   = 19;
  const int16_t bottomY  = 25;
  const int16_t wingHalf = 6;

  const uint8_t beat = (tick / 4) % 6;
  uint8_t dotR = (beat == 1 || beat == 2) ? 3 : 2;
  bool ring   = (beat == 5);
  if (ring) {
    oled.drawCircle(cx, dotY, dotR + 1);
  } else {
    oled.drawDisc(cx, dotY, dotR);
  }

  oled.drawTriangle(cx - wingHalf, topY,
                    cx,            waistY,
                    cx - wingHalf, bottomY);
  oled.drawTriangle(cx + wingHalf, topY,
                    cx,            waistY,
                    cx + wingHalf, bottomY);
}

void setup() {
  Serial.begin(115200);
  delay(150);
  Serial.println();
  Serial.println("=====================================");
  Serial.println("  LIGHTENCY ESP32-S3 — OLED splash");
  Serial.println("=====================================");
  Serial.println("  no sensors required; flash the");
  Serial.println("  'esp32dev' env when they arrive.");
  Serial.println("-------------------------------------");

#ifdef HAS_VEXT_GATE
  pinMode(OLED_VEXT, OUTPUT);
  digitalWrite(OLED_VEXT, LOW);
  delay(50);
#endif

  oled.begin();
  oled.enableUTF8Print();
  oled.setContrast(255);
}

void loop() {
  const uint32_t now = millis();
  if (now - lastFrameMs < 180) return;
  lastFrameMs = now;
  tick++;

  oled.clearBuffer();

  oled.drawRFrame(0, 0, 128, 64, 4);

  drawSparkles();

  drawLogo();

  oled.setFont(u8g2_font_helvB10_tr);
  const char* brand = "LIGHTENCY";
  int brandW = oled.getStrWidth(brand);
  oled.drawStr(centerX(brandW), 38, brand);

  oled.setFont(u8g2_font_b10_t_japanese1);
  const char* sub = "つづく";
  int subW = oled.getUTF8Width(sub);
  oled.setCursor(centerX(subW), 51);
  oled.print(sub);

  oled.drawHLine(36, 55, 56);
  oled.setFont(u8g2_font_5x7_tf);
  const char* status = "Loading";
  int statusW = oled.getStrWidth(status);
  const int dotsW = 3 * 6;
  const int gap   = 5;
  const int footerW = statusW + gap + dotsW;
  const int footerX = centerX(footerW);
  oled.drawStr(footerX, 62, status);
  drawLoadingDots(footerX + statusW + gap, 60);

  oled.sendBuffer();
}
