/*
 * LIGHTENCY ESP32-S3 — OLED splash.
 *
 * Pre-sensor placeholder for the HiLetgo ESP32 OLED Kit V3 (a.k.a.
 * Heltec WiFi Kit 32 V3 — ESP32-S3 silicon). Drives only the onboard
 * 0.96" SSD1306 OLED. No WiFi, no external sensors, no config.h. Plug
 * the board in, flash this env, and the screen lights up with the
 * LIGHTENCY logomark, an anime "つづく" (tsuzuku — "to be continued")
 * sign-off, and a quietly pulsing beacon.
 *
 *   pio run -e splash -t upload
 *   pio device monitor          # 115200 baud
 *
 * When the sensors arrive, switch to the operational firmware:
 *
 *   pio run -e esp32dev -t upload
 *
 * Wire layout for the onboard OLED on the V3 board (ESP32-S3 silicon —
 * already routed on the dev board, nothing for you to wire):
 *
 *   GPIO 17  →  SSD1306 SDA
 *   GPIO 18  →  SSD1306 SCL
 *   GPIO 21  →  SSD1306 RESET (pulled HIGH at boot by U8g2)
 *   GPIO 36  →  VEXT power gate (active-LOW; must drive LOW or the OLED
 *               is unpowered)
 *
 * If you have the legacy V1/V2 board (classic ESP32-WROOM-32), the pin
 * map is different: SDA=4, SCL=15, RST=16, no Vext gate. Change the
 * constants below and remove the Vext block in setup().
 */

#include <Arduino.h>
#include <U8g2lib.h>

// ─── HiLetgo / Heltec ESP32 OLED Kit V3 pinout (ESP32-S3) ─────────
static constexpr uint8_t OLED_SDA = 17;
static constexpr uint8_t OLED_SCL = 18;
static constexpr uint8_t OLED_RST = 21;

// V3 boards gate the OLED's 3.3V rail through GPIO 36 ("Vext"). Drive
// LOW to power the OLED. The V1/V2 boards don't have this — `#undef`
// the macro below if you're on legacy hardware.
#define HAS_VEXT_GATE
static constexpr uint8_t OLED_VEXT = 36;

// Full-buffer hardware I²C constructor. Buffer = 128 × 64 / 8 = 1024 B
// of RAM, trivial on the ESP32-S3; full buffer means single-shot sends +
// no tearing during animation.
U8G2_SSD1306_128X64_NONAME_F_HW_I2C oled(
    U8G2_R0,
    /* reset = */ OLED_RST,
    /* clock = */ OLED_SCL,
    /* data  = */ OLED_SDA);

// ─── Animation state ───────────────────────────────────────────────
static uint32_t lastFrameMs = 0;
static uint16_t tick        = 0;

// Two small sparkles, one top-left and one top-right, just enough to
// hint at motion without crowding the title card.
struct Sparkle { int8_t x, y; uint8_t phase; };
static Sparkle sparkles[] = {
  {  18,  6,  0  },
  { 109,  6,  12 },
};
static constexpr size_t SPARKLE_COUNT = sizeof(sparkles) / sizeof(sparkles[0]);

// ─── Drawing helpers ───────────────────────────────────────────────
static int centerX(int textWidth) {
  return (128 - textWidth) / 2;
}

// Sparkles cycle off → dot → cross → off, staggered so one is usually lit.
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

// Three loading dots that fill in sequence: ○○○ → ●○○ → ●●○ → ●●● → ○○○.
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

/**
 * LIGHTENCY logomark — primitive approximation, compact form.
 *
 * Reference: a yellow filled disc above a stylised bowtie. On a 64-pixel
 * monochrome OLED we draw:
 *
 *   • a small pulsing top disc (the "beacon"; radius 2 → 3 cycling, with
 *     a brief ring frame to emphasise the pulse)
 *   • two filled triangles meeting at a centre vertex (the bowtie)
 *
 * Footprint: 13 px wide × 18 px tall, centred horizontally.
 *
 * For a pixel-faithful render of the actual logo PNG, export it as a
 * 24×30 1-bit XBM and replace the contents of this function with a
 * single `oled.drawXBM(...)` call. Tool: https://javl.github.io/image2cpp/
 */
static void drawLogo() {
  const int16_t cx       = 64;
  const int16_t dotY     = 7;
  const int16_t topY     = 13;
  const int16_t waistY   = 19;
  const int16_t bottomY  = 25;
  const int16_t wingHalf = 6;

  // Beacon dot — a quiet 6-phase pulse.
  const uint8_t beat = (tick / 4) % 6;
  uint8_t dotR = (beat == 1 || beat == 2) ? 3 : 2;
  bool ring   = (beat == 5);
  if (ring) {
    oled.drawCircle(cx, dotY, dotR + 1);
  } else {
    oled.drawDisc(cx, dotY, dotR);
  }

  // Bowtie wings — two solid triangles meeting at the waist.
  oled.drawTriangle(cx - wingHalf, topY,
                    cx,            waistY,
                    cx - wingHalf, bottomY);
  oled.drawTriangle(cx + wingHalf, topY,
                    cx,            waistY,
                    cx + wingHalf, bottomY);
}

// ─── Lifecycle ─────────────────────────────────────────────────────
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
  // Power the OLED rail. Active-LOW; idle (HIGH) means OLED off.
  pinMode(OLED_VEXT, OUTPUT);
  digitalWrite(OLED_VEXT, LOW);
  delay(50);
#endif

  oled.begin();
  oled.enableUTF8Print();    // required so .print() handles multi-byte CJK
  oled.setContrast(255);
}

void loop() {
  const uint32_t now = millis();
  if (now - lastFrameMs < 180) return;
  lastFrameMs = now;
  tick++;

  oled.clearBuffer();

  // ── Thin rounded frame: gives the splash a polished "card" feel ──
  oled.drawRFrame(0, 0, 128, 64, 4);

  // ── Subtle decorative sparkles ──
  drawSparkles();

  // ── Centred logomark ──
  drawLogo();

  // ── Brand: LIGHTENCY ──
  // Helvetica Bold 10 — smaller than the previous Inconsolata 16 px
  // but still bold and centred. 9 chars × ~6 px ≈ 54 px wide.
  oled.setFont(u8g2_font_helvB10_tr);
  const char* brand = "LIGHTENCY";
  int brandW = oled.getStrWidth(brand);
  oled.drawStr(centerX(brandW), 38, brand);

  // ── Subtitle: つづく (tsuzuku — "to be continued") ──
  // Matched 10-px bold size with Japanese coverage so it pairs cleanly
  // with LIGHTENCY above. つ / づ / く all live in basic hiragana —
  // present in every `b10_t_japaneseN` variant.
  oled.setFont(u8g2_font_b10_t_japanese1);
  const char* sub = "つづく";
  int subW = oled.getUTF8Width(sub);
  oled.setCursor(centerX(subW), 51);
  oled.print(sub);

  // ── Footer: short divider + status + animated dots ──
  oled.drawHLine(36, 55, 56);
  oled.setFont(u8g2_font_5x7_tf);
  const char* status = "Loading";
  int statusW = oled.getStrWidth(status);
  const int dotsW = 3 * 6;          // three dots, 6 px each
  const int gap   = 5;
  const int footerW = statusW + gap + dotsW;
  const int footerX = centerX(footerW);
  oled.drawStr(footerX, 62, status);
  drawLoadingDots(footerX + statusW + gap, 60);

  oled.sendBuffer();
}
