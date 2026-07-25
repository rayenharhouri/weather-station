import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthResponse, PublicUser } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { User } from './entities/user.entity';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Exchange email + password for a JWT session token.' })
  async login(@Body() dto: LoginDto, @Req() req: Request): Promise<AuthResponse> {
    return this.authService.login(dto, req.tenant);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth('jwt')
  @ApiOperation({ summary: 'Return the user the current JWT belongs to.' })
  async me(@CurrentUser() user: User): Promise<PublicUser> {
    return this.authService.toPublic(user);
  }
}
