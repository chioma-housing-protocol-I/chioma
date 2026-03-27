import { Controller, Get, UseGuards, Logger } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ReferralService } from './referral.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('Referrals')
@Controller('referrals')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
export class ReferralController {
  private readonly logger = new Logger(ReferralController.name);

  constructor(private readonly referralService: ReferralService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get referral statistics for current user' })
  @ApiResponse({ status: 200, description: 'Return referral statistics' })
  async getStats(@CurrentUser() user: User) {
    return this.referralService.getReferralStats(user.id);
  }

  @Get('code')
  @ApiOperation({ summary: 'Get current user referral code' })
  @ApiResponse({ status: 200, description: 'Return referral code' })
  async getCode(@CurrentUser() user: User) {
    return { referralCode: user.referralCode };
  }
}
