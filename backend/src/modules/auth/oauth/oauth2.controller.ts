import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { OAuth2Service } from './oauth2.service';
import {
  OAuth2AuthorizeDto,
  OAuth2CallbackDto,
  OAuth2LinkDto,
  OAuth2RevokeDto,
} from './dto/oauth2.dto';
import { OAuth2Provider } from './oauth2.types';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { User } from '../../users/entities/user.entity';

@ApiTags('OAuth2 Authentication')
@Controller('auth/oauth')
export class OAuth2Controller {
  constructor(private readonly oauth2Service: OAuth2Service) {}

  @Get('authorize')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Start OAuth2 authorization code flow' })
  initiateAuthorization(@Query() query: OAuth2AuthorizeDto) {
    return this.oauth2Service.initiateAuthorization(
      query.provider,
      query.redirectUri,
    );
  }

  @Post('callback')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary: 'Complete OAuth2 callback and issue session tokens',
  })
  completeAuthorization(@Body() dto: OAuth2CallbackDto) {
    return this.oauth2Service.completeAuthorization(
      dto.provider,
      dto.code,
      dto.state,
      dto.redirectUri,
    );
  }

  @Get('profile')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({ summary: 'Fetch user profile from OAuth2 provider' })
  getProfile(
    @Query('provider') provider: OAuth2Provider,
    @Query('accessToken') accessToken: string,
  ) {
    return this.oauth2Service.getUserProfile(provider, accessToken);
  }

  @Post('link')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Link an OAuth2 provider to the current account' })
  linkAccount(@CurrentUser() user: User, @Body() dto: OAuth2LinkDto) {
    return this.oauth2Service.linkAccount(
      user.id,
      dto.provider,
      dto.code,
      dto.state,
      dto.redirectUri,
    );
  }

  @Post('link/authorize')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Start OAuth2 flow for account linking' })
  initiateAccountLink(
    @CurrentUser() user: User,
    @Body() dto: OAuth2AuthorizeDto,
  ) {
    return this.oauth2Service.initiateAccountLink(
      user.id,
      dto.provider,
      dto.redirectUri,
    );
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Logout and revoke OAuth2 provider tokens' })
  logout(
    @CurrentUser() user: User,
    @Query('provider') provider?: OAuth2Provider,
  ) {
    return this.oauth2Service.logout(user.id, provider);
  }

  @Post('revoke')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Revoke an OAuth2 provider token' })
  async revokeToken(@Body() dto: OAuth2RevokeDto): Promise<void> {
    await this.oauth2Service.revokeProviderToken(dto.provider, dto.token);
  }
}
