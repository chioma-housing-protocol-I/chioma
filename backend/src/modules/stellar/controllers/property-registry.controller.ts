import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PropertyRegistryService } from '../services/property-registry.service';
import {
  RegisterPropertyDto,
  TransferPropertyDto,
  VerifyPropertyDto,
} from '../dto/property-registry.dto';

@ApiTags('Property Registry')
@ApiBearerAuth()
@Controller('properties/registry')
export class PropertyRegistryController {
  constructor(private readonly propertyRegistry: PropertyRegistryService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a property on-chain' })
  async registerProperty(@Body() dto: RegisterPropertyDto) {
    const txHash = await this.propertyRegistry.registerProperty(
      dto.propertyId,
      dto.ownerAddress,
      dto.metadataHash,
    );
    return { txHash, message: 'Property registered on-chain' };
  }

  @Post('transfer')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Transfer property ownership on-chain' })
  async transferProperty(@Body() dto: TransferPropertyDto) {
    const txHash = await this.propertyRegistry.transferProperty(
      dto.propertyId,
      dto.fromAddress,
      dto.toAddress,
    );
    return { txHash, message: 'Property ownership transferred on-chain' };
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Admin] Verify a property on-chain' })
  async verifyProperty(@Body() dto: VerifyPropertyDto) {
    const txHash = await this.propertyRegistry.verifyProperty(
      dto.propertyId,
      dto.verifierAddress,
    );
    return { txHash, message: 'Property verified on-chain' };
  }

  @Get('count')
  @ApiOperation({ summary: 'Get total number of registered properties' })
  async getPropertyCount() {
    const count = await this.propertyRegistry.getPropertyCount();
    return { count };
  }

  @Get(':propertyId/history')
  @ApiOperation({ summary: 'Get transfer history for a property' })
  async getPropertyHistory(@Param('propertyId') propertyId: string) {
    const history = await this.propertyRegistry.getPropertyHistory(propertyId);
    return { propertyId, history };
  }

  @Get(':propertyId')
  @ApiOperation({ summary: 'Get property information from blockchain' })
  async getProperty(@Param('propertyId') propertyId: string) {
    const property = await this.propertyRegistry.getProperty(propertyId);
    if (!property) {
      return { message: 'Property not found' };
    }
    return property;
  }
}
