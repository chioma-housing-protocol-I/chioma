import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ProfileService } from './profile.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import {
  ProfileResponseDto,
  ProfileCreatedResponseDto,
  ProfileUpdatedResponseDto,
  DataIntegrityResponseDto,
} from './dto/profile-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('Profile')
@Controller('profile')
@UseInterceptors(ClassSerializerInterceptor)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create profile',
    description:
      'Creates a new on-chain profile for the authenticated user. Requires a connected Stellar wallet.',
  })
  @ApiResponse({
    status: 201,
    description: 'Profile created successfully',
    type: ProfileCreatedResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - wallet not connected or invalid input',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 409, description: 'Profile already exists' })
  async createProfile(
    @CurrentUser() user: User,
    @Body() createProfileDto: CreateProfileDto,
  ): Promise<ProfileCreatedResponseDto> {
    return this.profileService.createProfile(user.id, createProfileDto);
  }

  @Put()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update profile',
    description:
      "Updates the authenticated user's profile. If the data hash changes, the on-chain data will be updated.",
  })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
    type: ProfileUpdatedResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - wallet not connected or invalid input',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  async updateProfile(
    @CurrentUser() user: User,
    @Body() updateProfileDto: UpdateProfileDto,
  ): Promise<ProfileUpdatedResponseDto> {
    return this.profileService.updateProfile(user.id, updateProfileDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get current user profile',
    description:
      'Retrieves the on-chain and off-chain profile data for the authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: 'Profile retrieved successfully',
    type: ProfileResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - wallet not connected',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@CurrentUser() user: User): Promise<ProfileResponseDto> {
    return this.profileService.getProfile(user.id);
  }

  @Get('wallet/:address')
  @ApiOperation({
    summary: 'Get profile by wallet address',
    description:
      'Retrieves the on-chain and off-chain profile data for a given wallet address. This is a public endpoint.',
  })
  @ApiParam({
    name: 'address',
    description: 'Stellar wallet address (56 characters, starts with G)',
    example: 'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI',
  })
  @ApiResponse({
    status: 200,
    description: 'Profile retrieved successfully',
    type: ProfileResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid wallet address format',
  })
  async getProfileByWallet(
    @Param('address') address: string,
  ): Promise<ProfileResponseDto> {
    return this.profileService.getProfileByWallet(address);
  }

  @Get('verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Verify data integrity',
    description:
      'Verifies that the off-chain profile data matches the hash stored on-chain.',
  })
  @ApiResponse({
    status: 200,
    description: 'Data integrity check completed',
    type: DataIntegrityResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - wallet not connected',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  async verifyDataIntegrity(
    @CurrentUser() user: User,
  ): Promise<DataIntegrityResponseDto> {
    return this.profileService.verifyDataIntegrity(user.id);
  }
}
