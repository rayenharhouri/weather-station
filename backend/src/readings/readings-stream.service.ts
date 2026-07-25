import { Injectable, Logger } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import { WeatherReading } from './entities/weather-reading.entity';

/**
 * In-memory pub/sub for live reading streams. Subscribers are keyed by
 * `<tenantSlug>:<stationId>`. Single-instance only — scaling out requires
 * a Redis/NATS adapter behind this interface.
 */
@Injectable()
export class ReadingsStreamService {
  private readonly logger = new Logger(ReadingsStreamService.name);
  private readonly channels = new Map<string, Subject<WeatherReading>>();

  private channelKey(tenantSlug: string, stationId: string): string {
    return `${tenantSlug}:${stationId}`;
  }

  private ensureChannel(key: string): Subject<WeatherReading> {
    let subject = this.channels.get(key);
    if (!subject) {
      subject = new Subject<WeatherReading>();
      this.channels.set(key, subject);
    }
    return subject;
  }

  publish(tenantSlug: string, reading: WeatherReading): void {
    const subject = this.channels.get(this.channelKey(tenantSlug, reading.stationId));
    subject?.next(reading);
  }

  subscribe(tenantSlug: string, stationId: string): Observable<WeatherReading> {
    const key = this.channelKey(tenantSlug, stationId);
    return this.ensureChannel(key).asObservable();
  }
}
