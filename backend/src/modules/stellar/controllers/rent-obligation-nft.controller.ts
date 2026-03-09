import { Controller, Post, Body, Get, Param, UseGuards } from '@nestjs/common';
import { RentObligationNftService } from '../services/rent-obligation-nft.service';
import {
  MintNFTDto,
  TransferNFTDto,
  BurnNFTDto,
  NFTMetadata,
} from '../dto/rent-obligation-nft.dto';
// Assuming AuthGuard exists in the project
// import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('stellar/rent-obligation')
// @UseGuards(JwtAuthGuard)
export class RentObligationNftController {
  constructor(private readonly nftService: RentObligationNftService) {}

  @Post('mint')
  async mintNFT(@Body() dto: MintNFTDto): Promise<{ txHash: string }> {
    const txHash = await this.nftService.mintRentObligationNFT(
      dto.agreementId,
      dto.tenantAddress,
      dto.metadata,
    );
    return { txHash };
  }

  @Post('transfer')
  async transferNFT(@Body() dto: TransferNFTDto): Promise<{ txHash: string }> {
    const txHash = await this.nftService.transferNFT(
      dto.fromAddress,
      dto.toAddress,
      dto.tokenId,
    );
    return { txHash };
  }

  @Post('burn')
  async burnNFT(@Body() dto: BurnNFTDto): Promise<{ txHash: string }> {
    const txHash = await this.nftService.burnNFT(
      dto.tokenId,
      dto.ownerAddress,
    );
    return { txHash };
  }

  @Get(':tokenId/owner')
  async getNFTOwner(@Param('tokenId') tokenId: string): Promise<{ owner: string | null }> {
    const owner = await this.nftService.getNFTOwner(tokenId);
    return { owner };
  }

  @Get(':tokenId/metadata')
  async getNFTMetadata(@Param('tokenId') tokenId: string): Promise<NFTMetadata | null> {
    return this.nftService.getNFTMetadata(tokenId);
  }

  @Get('owner/:address')
  async getNFTsByOwner(@Param('address') address: string) {
    return this.nftService.getNFTsByOwner(address);
  }

  @Get(':tokenId/validate/:ownerAddress')
  async validateOwnership(@Param('tokenId') tokenId: string, @Param('ownerAddress') ownerAddress: string) {
    return { isValid: await this.nftService.validateNFTOwnership(tokenId, ownerAddress) };
  }
}