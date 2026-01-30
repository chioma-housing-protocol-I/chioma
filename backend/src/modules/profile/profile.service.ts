import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfileMetadata } from './entities/profile-metadata.entity';
import { SorobanClientService } from '../../common/services/soroban-client.service';
import {
  ProfileContractService,
  AccountType,
} from '../../blockchain/profile/profile.service';
import { IpfsService, ProfileIpfsData } from './services/ipfs.service';
import { CreateProfileDto, AccountTypeDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import {
  ProfileResponseDto,
  ProfileCreatedResponseDto,
  ProfileUpdatedResponseDto,
  DataIntegrityResponseDto,
} from './dto/profile-response.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class ProfileService {
  private readonly logger = new Logger(ProfileService.name);

  constructor(
    @InjectRepository(ProfileMetadata)
    private profileMetadataRepository: Repository<ProfileMetadata>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private sorobanClient: SorobanClientService,
    private profileContract: ProfileContractService,
    private ipfsService: IpfsService,
  ) {}

  async createProfile(
    userId: string,
    dto: CreateProfileDto,
  ): Promise<ProfileCreatedResponseDto> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.walletAddress) {
      throw new BadRequestException(
        'Wallet address required. Please connect your Stellar wallet first.',
      );
    }

    const existingProfile = await this.profileMetadataRepository.findOne({
      where: [{ userId }, { walletAddress: user.walletAddress }],
    });

    if (existingProfile) {
      throw new ConflictException('Profile already exists for this user');
    }

    const ipfsData: ProfileIpfsData = {
      displayName: dto.displayName || null,
      bio: dto.bio || null,
      avatarUrl: dto.avatarUrl || null,
      metadata: dto.metadata || null,
      walletAddress: user.walletAddress,
      timestamp: Date.now(),
    };

    let ipfsCid: string | null = null;
    let ipfsUrl: string | null = null;
    let dataHash: string;

    if (this.ipfsService.isConfigured()) {
      const ipfsResult = await this.ipfsService.uploadProfileData(ipfsData);
      ipfsCid = ipfsResult.cid;
      ipfsUrl = ipfsResult.url;
      dataHash = ipfsResult.dataHash;
      this.logger.log(`Profile data uploaded to IPFS: ${ipfsCid}`);
    } else {
      dataHash = this.ipfsService.computeDataHashHex(ipfsData);
      this.logger.warn('IPFS not configured, storing hash only');
    }

    const accountType = this.dtoToAccountType(dto.accountType);
    const dataHashBuffer = Buffer.from(dataHash, 'hex');
    const transactionHash = await this.profileContract.createProfile(
      user.walletAddress,
      accountType,
      dataHashBuffer,
    );

    const profileMetadata = this.profileMetadataRepository.create({
      userId,
      walletAddress: user.walletAddress,
      displayName: dto.displayName || null,
      bio: dto.bio || null,
      avatarUrl: dto.avatarUrl || null,
      metadata: dto.metadata || null,
      dataHash,
      ipfsCid,
      lastSyncedAt: new Date(),
    });

    await this.profileMetadataRepository.save(profileMetadata);

    this.logger.log(
      `Profile created for user ${userId} with tx: ${transactionHash}`,
    );

    return {
      message: 'Profile created successfully',
      transactionHash,
      dataHash,
      ipfsCid: ipfsCid || undefined,
      ipfsUrl: ipfsUrl || undefined,
    };
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<ProfileUpdatedResponseDto> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.walletAddress) {
      throw new BadRequestException('Wallet address required');
    }

    const profileMetadata = await this.profileMetadataRepository.findOne({
      where: { userId },
    });

    if (!profileMetadata) {
      throw new NotFoundException(
        'Profile not found. Please create a profile first.',
      );
    }

    const updatedData = {
      displayName:
        dto.displayName !== undefined
          ? dto.displayName
          : profileMetadata.displayName,
      bio: dto.bio !== undefined ? dto.bio : profileMetadata.bio,
      avatarUrl:
        dto.avatarUrl !== undefined ? dto.avatarUrl : profileMetadata.avatarUrl,
      metadata:
        dto.metadata !== undefined ? dto.metadata : profileMetadata.metadata,
    };

    const ipfsData: ProfileIpfsData = {
      displayName: updatedData.displayName,
      bio: updatedData.bio,
      avatarUrl: updatedData.avatarUrl,
      metadata: updatedData.metadata,
      walletAddress: user.walletAddress,
      timestamp: Date.now(),
    };

    const newDataHash = this.ipfsService.computeDataHashHex(ipfsData);
    const hashChanged = newDataHash !== profileMetadata.dataHash;

    let transactionHash: string | undefined;
    let onChainUpdated = false;
    let ipfsCid: string | null = profileMetadata.ipfsCid;
    let ipfsUrl: string | null = ipfsCid
      ? this.ipfsService.getGatewayUrl(ipfsCid)
      : null;

    if (hashChanged && this.ipfsService.isConfigured()) {
      const ipfsResult = await this.ipfsService.uploadProfileData(ipfsData);
      ipfsCid = ipfsResult.cid;
      ipfsUrl = ipfsResult.url;
      this.logger.log(`Updated profile data uploaded to IPFS: ${ipfsCid}`);
    }

    if (hashChanged || dto.accountType !== undefined) {
      const accountType = dto.accountType
        ? this.dtoToAccountType(dto.accountType)
        : undefined;

      const dataHashBuffer = hashChanged
        ? Buffer.from(newDataHash, 'hex')
        : undefined;

      transactionHash = await this.profileContract.updateProfile(
        user.walletAddress,
        accountType,
        dataHashBuffer,
      );

      onChainUpdated = true;
      this.logger.log(
        `On-chain profile updated for user ${userId} with tx: ${transactionHash}`,
      );
    }

    profileMetadata.displayName = updatedData.displayName;
    profileMetadata.bio = updatedData.bio;
    profileMetadata.avatarUrl = updatedData.avatarUrl;
    profileMetadata.metadata = updatedData.metadata;
    profileMetadata.dataHash = newDataHash;
    profileMetadata.ipfsCid = ipfsCid;
    profileMetadata.lastSyncedAt = new Date();

    await this.profileMetadataRepository.save(profileMetadata);

    return {
      message: 'Profile updated successfully',
      transactionHash,
      onChainUpdated,
      dataHash: newDataHash,
      ipfsCid: ipfsCid || undefined,
      ipfsUrl: ipfsUrl || undefined,
    };
  }

  async getProfile(userId: string): Promise<ProfileResponseDto> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.walletAddress) {
      throw new BadRequestException('Wallet address required');
    }

    return this.getProfileByWallet(user.walletAddress);
  }

  async getProfileByWallet(walletAddress: string): Promise<ProfileResponseDto> {
    if (!this.sorobanClient.verifyStellarAddress(walletAddress)) {
      throw new BadRequestException('Invalid Stellar wallet address');
    }

    const onChainProfile = await this.profileContract.getProfile(walletAddress);
    const offChainProfile = await this.profileMetadataRepository.findOne({
      where: { walletAddress },
    });

    let dataIntegrityValid = false;
    if (onChainProfile && offChainProfile) {
      dataIntegrityValid = onChainProfile.dataHash === offChainProfile.dataHash;
    }

    return {
      walletAddress,
      onChain: onChainProfile
        ? {
            owner: onChainProfile.owner,
            version: onChainProfile.version,
            accountType: this.accountTypeToDto(onChainProfile.accountType),
            lastUpdated: onChainProfile.lastUpdated,
            dataHash: onChainProfile.dataHash,
            isVerified: onChainProfile.isVerified,
          }
        : null,
      offChain: offChainProfile
        ? {
            displayName: offChainProfile.displayName,
            bio: offChainProfile.bio,
            avatarUrl: offChainProfile.avatarUrl,
            metadata: offChainProfile.metadata,
            dataHash: offChainProfile.dataHash,
            ipfsCid: offChainProfile.ipfsCid,
            ipfsUrl: offChainProfile.ipfsCid
              ? this.ipfsService.getGatewayUrl(offChainProfile.ipfsCid)
              : null,
            lastSyncedAt: offChainProfile.lastSyncedAt,
          }
        : null,
      dataIntegrityValid,
    };
  }

  async verifyDataIntegrity(userId: string): Promise<DataIntegrityResponseDto> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.walletAddress) {
      throw new BadRequestException('Wallet address required');
    }

    const offChainProfile = await this.profileMetadataRepository.findOne({
      where: { userId },
    });

    if (!offChainProfile) {
      throw new NotFoundException('Profile not found');
    }

    const ipfsData: ProfileIpfsData = {
      displayName: offChainProfile.displayName,
      bio: offChainProfile.bio,
      avatarUrl: offChainProfile.avatarUrl,
      metadata: offChainProfile.metadata,
      walletAddress: user.walletAddress,
      timestamp: 0,
    };

    const computedHash = this.ipfsService.computeDataHashHex(ipfsData);

    if (offChainProfile.ipfsCid) {
      const ipfsValid = await this.ipfsService.verifyDataIntegrity(
        offChainProfile.ipfsCid,
        offChainProfile.dataHash,
      );
      if (!ipfsValid) {
        this.logger.warn(
          `IPFS data integrity check failed for ${offChainProfile.ipfsCid}`,
        );
      }
    }

    const onChainProfile = await this.profileContract.getProfile(
      user.walletAddress,
    );

    if (!onChainProfile) {
      return {
        valid: false,
        computedHash,
        onChainHash: null,
        message: 'Profile not found on-chain',
      };
    }

    const valid = offChainProfile.dataHash === onChainProfile.dataHash;

    return {
      valid,
      computedHash,
      onChainHash: onChainProfile.dataHash,
      message: valid
        ? 'Data integrity verified: off-chain data matches on-chain hash'
        : 'Data integrity mismatch: off-chain data does not match on-chain hash',
    };
  }

  private dtoToAccountType(dto: AccountTypeDto): AccountType {
    switch (dto) {
      case AccountTypeDto.Tenant:
        return AccountType.Tenant;
      case AccountTypeDto.Landlord:
        return AccountType.Landlord;
      case AccountTypeDto.Agent:
        return AccountType.Agent;
      default:
        return AccountType.Tenant;
    }
  }

  private accountTypeToDto(accountType: AccountType): AccountTypeDto {
    switch (accountType) {
      case AccountType.Tenant:
        return AccountTypeDto.Tenant;
      case AccountType.Landlord:
        return AccountTypeDto.Landlord;
      case AccountType.Agent:
        return AccountTypeDto.Agent;
      default:
        return AccountTypeDto.Tenant;
    }
  }
}
