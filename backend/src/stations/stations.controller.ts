import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentTenant } from '../tenancy/decorators/current-tenant.decorator';
import { Tenant } from '../tenancy/entities/tenant.entity';
import { Station } from './entities/station.entity';
import { StationsService } from './stations.service';

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

@UseGuards(JwtAuthGuard)
@ApiTags('stations')
@ApiBearerAuth('jwt')
@Controller('stations')
export class StationsController {
  constructor(private readonly stationsService: StationsService) {}

  @ApiOperation({ summary: "List every station in the calling tenant." })
  @Get()
  async list(@CurrentTenant() tenant: Tenant): Promise<PaginatedResponse<Station>> {
    const items = await this.stationsService.findAll(tenant.slug);
    return {
      items,
      total: items.length,
      page: 1,
      pageSize: items.length,
      hasMore: false,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Fetch one station by id.' })
  async getOne(
    @CurrentTenant() tenant: Tenant,
    @Param('id') id: string,
  ): Promise<Station> {
    return this.stationsService.findById(tenant.slug, id);
  }
}
