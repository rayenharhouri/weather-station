import {
  Controller,
  Get,
  NotFoundException,
  Query,
  UseGuards,
} from '@nestjs/common';
import { IsUUID } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentTenant } from '../tenancy/decorators/current-tenant.decorator';
import { Tenant } from '../tenancy/entities/tenant.entity';
import { ReadingsService, type DeviceStatus } from '../readings/readings.service';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

class DeviceStatusQueryDto {
  @IsUUID()
  stationId!: string;
}

@UseGuards(JwtAuthGuard)
@ApiTags('device')
@ApiBearerAuth('jwt')
@Controller('device')
export class DeviceController {
  constructor(private readonly readings: ReadingsService) {}

  @ApiOperation({ summary: "Computed device-status snapshot for a station." })
  @Get('status')
  async status(
    @CurrentTenant() tenant: Tenant,
    @Query() query: DeviceStatusQueryDto,
  ): Promise<DeviceStatus> {
    const result = await this.readings.getDeviceStatus(tenant.slug, query.stationId);
    if (!result) {
      throw new NotFoundException(`station ${query.stationId} not found`);
    }
    return result;
  }
}
