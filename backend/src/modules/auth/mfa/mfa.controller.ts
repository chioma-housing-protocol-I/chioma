import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { MfaService } from './mfa.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import {
  EnableMfaDto,
  DisableMfaDto,
  VerifyMfaDto,
  RegenerateBackupCodesDto,
} from '../dto/mfa.dto';

interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
}

@ApiTags('MFA')
@ApiBearerAuth('JWT-auth')
@Controller('api/auth/mfa')
@UseGuards(JwtAuthGuard)
export class MfaController {
  constructor(private readonly mfaService: MfaService) {}

  /**
   * Generate MFA secret and QR code
   */
  @Post('setup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set up MFA for current user' })
  @ApiResponse({
    status: 200,
    description: 'MFA secret and backup codes generated',
  })
  async setupMfa(@CurrentUser() user: AuthenticatedUser) {
    return await this.mfaService.generateSecret(user.id);
  }

  /**
   * Enable MFA after verifying code
   */
  @Post('enable')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enable MFA after verification' })
  @ApiResponse({ status: 200, description: 'MFA enabled successfully' })
  @ApiResponse({ status: 400, description: 'Invalid verification code' })
  async enableMfa(
    @CurrentUser() user: AuthenticatedUser,
    @Body() enableMfaDto: EnableMfaDto,
  ) {
    return await this.mfaService.enableMfa(user.id, enableMfaDto.code);
  }

  /**
   * Disable MFA
   */
  @Post('disable')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disable MFA' })
  @ApiResponse({ status: 200, description: 'MFA disabled successfully' })
  @ApiResponse({ status: 401, description: 'Invalid verification code' })
  async disableMfa(
    @CurrentUser() user: AuthenticatedUser,
    @Body() disableMfaDto: DisableMfaDto,
  ) {
    return await this.mfaService.disableMfa(user.id, disableMfaDto.code);
  }

  /**
   * Check if MFA is enabled
   */
  @Get('status')
  @ApiOperation({ summary: 'Check MFA status' })
  @ApiResponse({ status: 200, description: 'MFA status' })
  async getMfaStatus(@CurrentUser() user: AuthenticatedUser) {
    const enabled = await this.mfaService.isMfaEnabled(user.id);
    return { mfaEnabled: enabled };
  }

  /**
   * Regenerate backup codes
   */
  @Post('backup-codes')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Regenerate backup codes' })
  @ApiResponse({ status: 200, description: 'New backup codes generated' })
  @ApiResponse({ status: 401, description: 'Invalid verification code' })
  async regenerateBackupCodes(
    @CurrentUser() user: AuthenticatedUser,
    @Body() regenerateDto: RegenerateBackupCodesDto,
  ) {
    return await this.mfaService.regenerateBackupCodes(
      user.id,
      regenerateDto.code,
    );
  }
}

/**
 * Standalone MFA verification controller for login flow
 */
@ApiTags('Auth')
@Controller('api/auth')
export class MfaVerificationController {
  constructor(private readonly mfaService: MfaService) {}

  /**
   * Verify MFA code during login
   * Called after initial login if MFA is enabled
   */
  @Post('mfa/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify MFA code during login' })
  @ApiResponse({ status: 200, description: 'MFA verified' })
  @ApiResponse({ status: 401, description: 'Invalid MFA code' })
  async verifyMfaLogin(@Body() verifyMfaDto: VerifyMfaDto) {
    const isValid = await this.mfaService.verifyMfaCode(
      verifyMfaDto.userId,
      verifyMfaDto.code,
    );

    if (!isValid) {
      return { verified: false, message: 'Invalid verification code' };
    }

    return { verified: true };
  }
}
