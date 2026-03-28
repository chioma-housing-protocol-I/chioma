import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../users/entities/user.entity';
import { PropertyModesService } from '../services/property-modes.service';
import {
  UpdatePropertyModeDto,
  SwitchModeDto,
} from '../dto/update-property-mode.dto';

@ApiTags('Property Modes')
@ApiBearerAuth('JWT-auth')
@Controller('api/properties/:propertyId/mode')
export class PropertyModesController {
  constructor(private readonly propertyModesService: PropertyModesService) {}

  @Get()
  @ApiOperation({ summary: 'Get current rental mode and settings' })
  @ApiResponse({ status: 200, description: 'Current mode settings' })
  getMode(@Param('propertyId', ParseUUIDPipe) propertyId: string) {
    return this.propertyModesService.getPropertyMode(propertyId);
  }

  @Patch()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update rental mode and settings' })
  @ApiResponse({ status: 200, description: 'Mode updated' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 403, description: 'Not the property owner' })
  updateMode(
    @Param('propertyId', ParseUUIDPipe) propertyId: string,
    @Body() dto: UpdatePropertyModeDto,
    @CurrentUser() user: User,
  ) {
    return this.propertyModesService.updatePropertyMode(
      propertyId,
      dto,
      user.id,
    );
  }

  @Get('recommendations')
  @ApiOperation({ summary: 'Get AI-powered mode recommendations' })
  @ApiResponse({ status: 200, description: 'Mode recommendations' })
  getModeRecommendations(
    @Param('propertyId', ParseUUIDPipe) propertyId: string,
  ) {
    return this.propertyModesService.getModeRecommendations(propertyId);
  }

  @Post('switch')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Switch mode (flexible properties only)' })
  @ApiResponse({ status: 201, description: 'Mode switched' })
  @ApiResponse({
    status: 400,
    description: 'Not in flexible mode or active bookings',
  })
  switchMode(
    @Param('propertyId', ParseUUIDPipe) propertyId: string,
    @Body() dto: SwitchModeDto,
    @CurrentUser() user: User,
  ) {
    return this.propertyModesService.switchMode(propertyId, dto, user.id);
  }
}
