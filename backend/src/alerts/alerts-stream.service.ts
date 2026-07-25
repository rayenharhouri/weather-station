import { Injectable } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import { Alert } from './entities/alert.entity';

/**
 * In-memory pub/sub for the alerts SSE stream. Mirrors the shape of
 * [ReadingsStreamService](../readings/readings-stream.service.ts) — single
 * instance only; scaling horizontally needs a Redis/NATS adapter behind
 * this interface.
 *
 * Subscribers can opt to filter on stationId; when omitted they receive
 * the whole tenant firehose. Both shapes are useful: the operations
 * Alerts page wants the firehose, individual station drill-downs filter.
 */
@Injectable()
export class AlertsStreamService {
  private readonly channels = new Map<string, Subject<Alert>>();

  private key(tenantSlug: string): string {
    return tenantSlug;
  }

  private ensureChannel(key: string): Subject<Alert> {
    let subject = this.channels.get(key);
    if (!subject) {
      subject = new Subject<Alert>();
      this.channels.set(key, subject);
    }
    return subject;
  }

  publish(tenantSlug: string, alert: Alert): void {
    this.channels.get(this.key(tenantSlug))?.next(alert);
  }

  subscribe(tenantSlug: string, stationId?: string): Observable<Alert> {
    const stream = this.ensureChannel(this.key(tenantSlug)).asObservable();
    if (!stationId) return stream;
    return new Observable<Alert>((subscriber) => {
      const sub = stream.subscribe({
        next: (alert) => {
          if (alert.stationId === stationId) subscriber.next(alert);
        },
        error: (err) => subscriber.error(err),
        complete: () => subscriber.complete(),
      });
      return () => sub.unsubscribe();
    });
  }
}
