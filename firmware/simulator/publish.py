#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import math
import os
import random
import sys
import time
from datetime import datetime, timezone

try:
    import paho.mqtt.client as mqtt
except ImportError:
    sys.exit("missing dep: pip install paho-mqtt")

DEFAULT_HOST      = os.environ.get("WH_MQTT_HOST", "localhost")
DEFAULT_PORT      = int(os.environ.get("WH_MQTT_PORT", "1883"))
DEFAULT_USER      = os.environ.get("WH_MQTT_USER", "ingest-worker")
DEFAULT_PASS      = os.environ.get("WH_MQTT_PASS", "ingest-worker")
DEFAULT_TENANT    = os.environ.get("WH_TENANT_SLUG", "enit")
DEFAULT_STATION   = os.environ.get("WH_STATION_ID",  "11111111-2222-3333-4444-555555555555")
DEFAULT_JWT       = os.environ.get("WH_DEVICE_JWT",  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.PASTE")


def iso_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def build_reading(start_temp: float = 22.0) -> dict:
    hour = datetime.now(timezone.utc).hour + datetime.now(timezone.utc).minute / 60.0
    temp_base = 18.0 + 8.0 * math.sin((hour - 8) * math.pi / 12)
    humidity_base = 65.0 - 25.0 * math.sin((hour - 8) * math.pi / 12)
    return {
        "recordedAt":      iso_now(),
        "temperatureC":    round(temp_base + random.uniform(-0.6, 0.6), 2),
        "humidityPct":     round(max(10, min(100, humidity_base + random.uniform(-3, 3))), 1),
        "pressureHpa":     round(1013.0 + random.uniform(-2, 2), 1),
        "lightLux":        max(0, int(80000 * max(0, math.sin((hour - 6) * math.pi / 13)) + random.randint(-4000, 4000))),
        "rainfallMm":      round(random.uniform(0, 1.5), 2) if random.random() < 0.05 else 0,
        "airQualityValue": int(40 + random.uniform(-10, 10)),
        "signalRssi":      random.randint(-70, -45),
    }


def publish_one(client: mqtt.Client, topic: str, jwt: str) -> None:
    payload = {"token": jwt, "reading": build_reading()}
    body = json.dumps(payload, separators=(",", ":"))
    info = client.publish(topic, body, qos=1)
    info.wait_for_publish(timeout=5)
    if info.rc != mqtt.MQTT_ERR_SUCCESS:
        print(f"[publish] FAILED · rc={info.rc}")
    else:
        snippet = body[:80] + ("…" if len(body) > 80 else "")
        print(f"[publish] {topic} · {snippet}")


def main() -> None:
    ap = argparse.ArgumentParser(description="WeatherHub MQTT publisher (simulator).")
    ap.add_argument("--host",     default=DEFAULT_HOST)
    ap.add_argument("--port",     type=int, default=DEFAULT_PORT)
    ap.add_argument("--user",     default=DEFAULT_USER)
    ap.add_argument("--password", default=DEFAULT_PASS)
    ap.add_argument("--tenant",   default=DEFAULT_TENANT,  help="tenant slug")
    ap.add_argument("--station",  default=DEFAULT_STATION, help="station UUID")
    ap.add_argument("--token",    default=DEFAULT_JWT,     help="device JWT (from device:provision)")
    ap.add_argument("--interval", type=int, default=5,     help="seconds between publishes")
    ap.add_argument("--count",    type=int, default=0,     help="stop after N publishes (0 = forever)")
    ap.add_argument("--once",     action="store_true",     help="publish a single reading and exit")
    args = ap.parse_args()

    if args.token.endswith("PASTE"):
        sys.exit(
            "Refusing to publish with the placeholder JWT. Mint one with:\n"
            "  docker compose exec backend node \\\n"
            "    dist/database/scripts/device-provision.js \\\n"
            "    --tenant=<slug> --station=<uuid>\n"
            "Then pass it via --token=… or set WH_DEVICE_JWT."
        )

    topic = f"tenants/{args.tenant}/stations/{args.station}/readings"

    try:
        client = mqtt.Client(
            mqtt.CallbackAPIVersion.VERSION2,
            client_id=f"wh-sim-{args.station[:8]}",
        )
    except AttributeError:
        client = mqtt.Client(client_id=f"wh-sim-{args.station[:8]}")

    if args.user:
        client.username_pw_set(args.user, args.password)

    print(f"[connect] {args.host}:{args.port} as '{args.user}'")
    print(f"[topic]   {topic}")
    client.connect(args.host, args.port, keepalive=60)
    client.loop_start()

    try:
        sent = 0
        while True:
            publish_one(client, topic, args.token)
            sent += 1
            if args.once or (args.count and sent >= args.count):
                break
            time.sleep(args.interval)
    except KeyboardInterrupt:
        print("\n[exit] interrupted")
    finally:
        client.loop_stop()
        client.disconnect()


if __name__ == "__main__":
    main()
