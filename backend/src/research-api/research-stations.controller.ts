import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TokenAuthGuard } from '../auth/guards/token-auth.guard';
import { CurrentApiToken } from '../auth/decorators/current-api-token.decorator';
import { CurrentTenant } from '../tenancy/decorators/current-tenant.decorator';
import { Tenant } from '../tenancy/entities/tenant.entity';
import { ApiToken } from '../tokens/entities/api-token.entity';
import { Station } from '../stations/entities/station.entity';
import { StationsService } from '../stations/stations.service';
import { intersectStations } from './scope';

interface V1Station {
  id: string;
  name: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  status: string;
  last_synced_at: string | null;
  enabled_sensors: string[];
}

@UseGuards(TokenAuthGuard)
@ApiTags('v1')
@ApiBearerAuth('api-token')
@Controller('v1/stations')
export class ResearchStationsController {
  constructor(private readonly stations: StationsService) {}

  @ApiOperation({ summary: "List stations the token can see." })
  @Get()
  async list(
    @CurrentApiToken() token: ApiToken,
    @CurrentTenant() tenant: Tenant,
  ): Promise<{ data: V1Station[]; next_cursor: null }> {
    const all = await this.stations.findAll(tenant.slug);
    const allowedIds = new Set(intersectStations(token, all.map((s) => s.id)));
    return {
      data: all.filter((s) => allowedIds.has(s.id)).map(toV1Station),
      next_cursor: null,
    };
  }
}

function toV1Station(s: Station): V1Station {
  return {
    id: s.id,
    name: s.name,
    location: s.location,
    latitude: s.latitude,
    longitude: s.longitude,
    status: s.status,
    last_synced_at: s.lastSyncedAt ? s.lastSyncedAt.toISOString() : null,
    enabled_sensors: s.enabledSensors,
  };
}
