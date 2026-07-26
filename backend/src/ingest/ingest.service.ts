import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import { connect, MqttClient } from 'mqtt';
import { IngestReadingDto } from '../readings/dto/ingest-reading.dto';
import { ReadingsService } from '../readings/readings.service';
import { DeviceJwtService } from './device-jwt.service';

const TOPIC_PATTERN_DEFAULT = 'tenants/+/stations/+/readings';

interface MqttPayload {
  token: string;
  reading: Record<string, unknown>;
}

@Injectable()
export class IngestService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(IngestService.name);
  private client: MqttClient | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly deviceJwt: DeviceJwtService,
    private readonly readings: ReadingsService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const mode = this.config.get<string>('mode');
    if (mode === 'test') {
      this.logger.log('mqtt worker disabled in test mode');
      return;
    }

    const url = this.config.get<string>('mqtt.url')!;
    const username = this.config.get<string>('mqtt.username');
    const password = this.config.get<string>('mqtt.password');
    const topicPattern = this.config.get<string>('mqtt.topicPattern') ?? TOPIC_PATTERN_DEFAULT;

    this.client = connect(url, {
      username,
      password,
      reconnectPeriod: 5_000,
      connectTimeout: 10_000,
      clientId: `wh-ingest-${process.pid}-${Date.now().toString(36)}`,
    });

    this.client.on('connect', () => {
      this.logger.log(`connected to ${url}; subscribing to ${topicPattern}`);
      this.client!.subscribe(topicPattern, { qos: 1 }, (err) => {
        if (err) this.logger.error(`subscribe failed: ${err.message}`);
      });
    });

    this.client.on('reconnect', () => this.logger.warn('mqtt reconnecting…'));
    this.client.on('error', (err) => this.logger.error(`mqtt error: ${err.message}`));
    this.client.on('close', () => this.logger.warn('mqtt connection closed'));

    this.client.on('message', (topic, payload) => {
      void this.handleMessage(topic, payload).catch((err) => {
        this.logger.warn(
          `unhandled handler error for ${topic}: ${err instanceof Error ? err.message : err}`,
        );
      });
    });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      await new Promise<void>((resolve) => this.client!.end(false, undefined, () => resolve()));
      this.client = null;
    }
  }

  async handleMessage(topic: string, payload: Buffer): Promise<void> {
    const parsedTopic = parseTopic(topic);
    if (!parsedTopic) {
      this.logger.warn(`rejected message: topic '${topic}' does not match expected shape`);
      return;
    }
    const { tenantSlug, stationId } = parsedTopic;

    let body: MqttPayload;
    try {
      body = JSON.parse(payload.toString('utf8')) as MqttPayload;
    } catch {
      this.logger.warn(`[${tenantSlug}/${stationId}] rejected: body is not valid JSON`);
      return;
    }
    if (!body?.token || !body?.reading) {
      this.logger.warn(`[${tenantSlug}/${stationId}] rejected: missing token or reading`);
      return;
    }

    let claims;
    try {
      claims = this.deviceJwt.verify(body.token);
    } catch (err) {
      this.logger.warn(
        `[${tenantSlug}/${stationId}] invalid_device_token: ${err instanceof Error ? err.message : err}`,
      );
      return;
    }
    if (claims.tenantSlug !== tenantSlug) {
      this.logger.warn(
        `[${tenantSlug}/${stationId}] cross_tenant_denied: token tenant=${claims.tenantSlug}`,
      );
      return;
    }
    if (claims.stationId !== stationId) {
      this.logger.warn(
        `[${tenantSlug}/${stationId}] cross_station_denied: token station=${claims.stationId}`,
      );
      return;
    }

    const dto = plainToInstance(IngestReadingDto, {
      ...body.reading,
      stationId, // topic wins; ignore any clash in the body
    });
    try {
      await validateOrReject(dto);
    } catch (errors) {
      this.logger.warn(
        `[${tenantSlug}/${stationId}] invalid_reading: ${JSON.stringify(errors).slice(0, 300)}`,
      );
      return;
    }
    if (claims.deviceId && !dto.deviceId) {
      dto.deviceId = claims.deviceId;
    }

    try {
      await this.readings.ingest(tenantSlug, dto);
    } catch (err) {
      this.logger.error(
        `[${tenantSlug}/${stationId}] persistence failed: ${err instanceof Error ? err.message : err}`,
      );
    }
  }
}

function parseTopic(topic: string): { tenantSlug: string; stationId: string } | null {
  const m = topic.match(/^tenants\/([^/]+)\/stations\/([^/]+)\/readings$/);
  if (!m) return null;
  return { tenantSlug: m[1], stationId: m[2] };
}
