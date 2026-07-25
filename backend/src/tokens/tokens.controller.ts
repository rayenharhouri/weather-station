import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../auth/entities/user.entity';
import { CurrentTenant } from '../tenancy/decorators/current-tenant.decorator';
import { Tenant } from '../tenancy/entities/tenant.entity';
import { CreateTokenDto } from './dto/create-token.dto';
import { ApiToken } from './entities/api-token.entity';
import { TokensService } from './tokens.service';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

@UseGuards(JwtAuthGuard)
@ApiTags('tokens')
@ApiBearerAuth('jwt')
@Controller('v1/tokens')
export class TokensController {
  constructor(private readonly tokens: TokensService) {}

  @ApiOperation({ summary: "List API tokens owned by the caller." })
  @Get()
  async list(
    @CurrentTenant() tenant: Tenant,
    @CurrentUser() user: User,
  ): Promise<PaginatedResponse<ApiToken>> {
    const items = await this.tokens.listForUser(tenant.slug, user.id);
    return {
      items,
      total: items.length,
      page: 1,
      pageSize: items.length,
      hasMore: false,
    };
  }

  @ApiOperation({ summary: "Mint a new API token; plaintext returned exactly once." })
  @Post()
  @HttpCode(201)
  async create(
    @CurrentTenant() tenant: Tenant,
    @CurrentUser() user: User,
    @Body() dto: CreateTokenDto,
  ): Promise<{ token: ApiToken; plaintext: string }> {
    return this.tokens.create(tenant.slug, user.id, dto);
  }

  @ApiOperation({ summary: "Revoke a token immediately." })
  @Delete(':id')
  async revoke(
    @CurrentTenant() tenant: Tenant,
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<ApiToken> {
    return this.tokens.revoke(tenant.slug, user.id, id);
  }

  @ApiOperation({ summary: "Revoke + reissue a token with the same scope." })
  @Post(':id/rotate')
  @HttpCode(201)
  async rotate(
    @CurrentTenant() tenant: Tenant,
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<{ token: ApiToken; plaintext: string }> {
    return this.tokens.rotate(tenant.slug, user.id, id);
  }
}
