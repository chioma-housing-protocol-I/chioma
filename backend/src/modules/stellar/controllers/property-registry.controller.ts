import { Controller, Post, Body, Get, Param, Headers } from '@nestjs/common';
import { PropertyRegistryService } from '../services/property-registry.service';
import {
  RegisterPropertyDto,
  TransferPropertyDto,
  VerifyPropertyDto,
} from '../dto/property-registry.dto';

@Controller('property-registry')
export class PropertyRegistryController {
  constructor(
    private readonly propertyRegistryService: PropertyRegistryService,
  ) {}

  @Post('register')
  async registerProperty(
    @Body() dto: RegisterPropertyDto,
    @Headers('x-signer-public-key') signerPublicKey: string,
  ) {
    const txHash = await this.propertyRegistryService.registerProperty(
      dto,
      signerPublicKey,
    );
    return { success: true, transactionHash: txHash };
  }

  @Post('transfer')
  async transferProperty(@Body() dto: TransferPropertyDto) {
    const txHash = await this.propertyRegistryService.transferProperty(dto);
    return { success: true, transactionHash: txHash };
  }

  @Post('verify')
  async verifyProperty(@Body() dto: VerifyPropertyDto) {
    const txHash = await this.propertyRegistryService.verifyProperty(dto);
    return { success: true, transactionHash: txHash };
  }

  @Get(':id')
  async getProperty(@Param('id') id: string) {
    const property = await this.propertyRegistryService.getProperty(id);
    return { success: true, data: property };
  }

  @Get('stats/count')
  async getPropertyCount() {
    const count = await this.propertyRegistryService.getPropertyCount();
    return { success: true, count };
  }

  @Get(':id/history')
  async getPropertyHistory(@Param('id') id: string) {
    const history = await this.propertyRegistryService.getPropertyHistory(id);
    return { success: true, data: history };
  }
}
