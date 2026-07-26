import { EntitySchema, MixedList } from 'typeorm';
import { User } from '../auth/entities/user.entity';
import { Station } from '../stations/entities/station.entity';
import { WeatherReading } from '../readings/entities/weather-reading.entity';
import { ApiToken } from '../tokens/entities/api-token.entity';
import { Alert } from '../alerts/entities/alert.entity';
import { Forecast } from '../forecasts/entities/forecast.entity';
import { IntegrityBatch } from '../integrity/entities/integrity-batch.entity';
import { AccountPreference } from '../account/entities/account-preference.entity';
import { RequestLog } from '../usage/entities/request-log.entity';
import { Grant } from '../grants/entities/grant.entity';
import { Dataset } from '../datasets/entities/dataset.entity';
import { ExportJob } from '../exports/entities/export-job.entity';

export const TENANT_ENTITIES: MixedList<Function | string | EntitySchema> = [
  User,
  Station,
  WeatherReading,
  ApiToken,
  Alert,
  Forecast,
  IntegrityBatch,
  AccountPreference,
  RequestLog,
  Grant,
  Dataset,
  ExportJob,
];

export const TENANT_MIGRATIONS_GLOB = __dirname + '/migrations/tenant/*{.ts,.js}';
