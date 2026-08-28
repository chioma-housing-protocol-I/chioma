import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Query,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PropertyRegistryService } from '../services/property-registry.service';
import {
  RegisterPropertyDto,
  TransferPropertyDto,
  VerifyPropertyDto,
} from '../dto/property-registry.dto';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

@Controller('property-registry')
@ApiTags('Property Registry')
export class PropertyRegistryController {
  constructor(
    private readonly propertyRegistryService: PropertyRegistryService,
  ) {}

  @ApiResponse({ status: 201, description: 'Created' })
  @ApiOperation({ summary: 'Register property' })
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

  @ApiResponse({ status: 201, description: 'Created' })
  @ApiOperation({ summary: 'Transfer property' })
  @Post('transfer')
  async transferProperty(@Body() dto: TransferPropertyDto) {
    const txHash = await this.propertyRegistryService.transferProperty(dto);
    return { success: true, transactionHash: txHash };
  }

  @ApiResponse({ status: 201, description: 'Created' })
  @ApiOperation({ summary: 'Verify property' })
  @Post('verify')
  async verifyProperty(@Body() dto: VerifyPropertyDto) {
    const txHash = await this.propertyRegistryService.verifyProperty(dto);
    return { success: true, transactionHash: txHash };
  }

  @ApiResponse({ status: 200, description: 'Retrieved' })
  @ApiOperation({ summary: 'Get property' })
  @Get(':id')
  async getProperty(@Param('id') id: string) {
    const property = await this.propertyRegistryService.getProperty(id);
    return { success: true, data: property };
  }

  @ApiResponse({ status: 200, description: 'Retrieved' })
  @ApiOperation({ summary: 'Get property count' })
  @Get('stats/count')
  async getPropertyCount() {
    const count = await this.propertyRegistryService.getPropertyCount();
    return { success: true, count };
  }

  @ApiResponse({ status: 200, description: 'Retrieved' })
  @ApiOperation({ summary: 'Get property history' })
  @Get(':id/history')
  async getPropertyHistory(
    @Param('id') id: string,
    @Query() query: PaginationQueryDto,
  ) {
    const history = await this.propertyRegistryService.getPropertyHistory(
      id,
      query.page,
      query.limit,
    );
    return { success: true, ...history };
  }
}
