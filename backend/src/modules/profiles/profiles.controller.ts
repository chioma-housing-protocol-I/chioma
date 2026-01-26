import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { ProfilesService } from './profiles.service';
import { SubmitOnChainDto, UpdateProfileDto } from './dto/update-profile.dto';

@ApiTags('Profiles')
@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Post('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update off-chain profile and prepare SEP-29 data' })
  @ApiResponse({
    status: 200,
    description: 'Profile prepared for on-chain update',
  })
  async updateProfile(
    @CurrentUser() user: User,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.profilesService.updateProfile(user.id, dto);
  }

  @Post('onchain/submit')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit signed SEP-29 account data transaction' })
  @ApiResponse({ status: 200, description: 'Transaction submitted' })
  async submitOnChain(@Body() dto: SubmitOnChainDto) {
    return this.profilesService.submitOnChainUpdate(dto.signedXdr);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get combined profile for current user' })
  @ApiResponse({ status: 200, description: 'Combined profile retrieved' })
  async getMyProfile(@CurrentUser() user: User) {
    return this.profilesService.getProfileForUser(user.id);
  }

  @Get(':accountId')
  @ApiOperation({ summary: 'Get combined profile by Stellar account' })
  @ApiResponse({ status: 200, description: 'Combined profile retrieved' })
  async getProfile(@Param('accountId') accountId: string) {
    return this.profilesService.getProfileByAccount(accountId);
  }
}
