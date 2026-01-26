import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { UserProfile } from './entities/user-profile.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { IpfsService } from './ipfs.service';
import { StellarProfileService } from './stellar-profile.service';
import {
  encodeProfileMapToScValXdr,
  MAX_DATA_HASH_LENGTH,
  OnChainProfileMap,
  SEP29_PROFILE_VERSION,
} from './utils/sep29';

@Injectable()
export class ProfilesService {
  private readonly minUpdateInterval: number;

  constructor(
    @InjectRepository(UserProfile)
    private readonly profileRepository: Repository<UserProfile>,
    private readonly ipfsService: IpfsService,
    private readonly stellarProfileService: StellarProfileService,
    private readonly configService: ConfigService,
  ) {
    this.minUpdateInterval = this.configService.get<number>(
      'PROFILE_MIN_UPDATE_INTERVAL_SECONDS',
      60,
    );
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const now = Math.floor(Date.now() / 1000);

    if (dto.accountType < 1 || dto.accountType > 3) {
      throw new BadRequestException('Invalid account type');
    }

    const onChainExisting = await this.stellarProfileService.getOnChainProfile(
      dto.stellarPublicKey,
    );

    if (
      onChainExisting &&
      now - onChainExisting.updated < this.minUpdateInterval
    ) {
      throw new BadRequestException('Profile update rate limited');
    }

    const profileJson: Record<string, unknown> = {
      displayName: dto.displayName,
      email: dto.email,
      avatarUrl: dto.avatarUrl,
      ...(dto.metadata || {}),
    };

    const dataHash = await this.ipfsService.addJson(profileJson);
    if (dataHash.length > MAX_DATA_HASH_LENGTH) {
      throw new BadRequestException('Data hash too large');
    }

    const onChainProfile: OnChainProfileMap = {
      version: SEP29_PROFILE_VERSION,
      type: dto.accountType,
      updated: now,
      data_hash: dataHash,
    };

    const dataValueXdr = encodeProfileMapToScValXdr(onChainProfile);
    const dataKey = this.stellarProfileService.getDataKey();

    const existing = await this.profileRepository.findOne({
      where: { userId },
    });

    const profile = this.profileRepository.create({
      id: existing?.id,
      userId,
      accountId: dto.stellarPublicKey,
      accountType: dto.accountType,
      dataHash,
      displayName: dto.displayName,
      email: dto.email ?? null,
      avatarUrl: dto.avatarUrl ?? null,
      profileJson,
    });

    const saved = await this.profileRepository.save(profile);

    return {
      dataKey,
      dataValueXdr,
      dataHash,
      onChain: onChainProfile,
      profile: saved,
    };
  }

  async submitOnChainUpdate(signedXdr: string) {
    const hash =
      await this.stellarProfileService.submitSignedTransaction(signedXdr);

    return { hash };
  }

  async getProfileForUser(userId: string) {
    const profile = await this.profileRepository.findOne({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    const onChain = await this.stellarProfileService.getOnChainProfile(
      profile.accountId,
    );

    return {
      accountId: profile.accountId,
      accountType: profile.accountType,
      dataHash: profile.dataHash,
      onChain,
      offChain: profile.profileJson,
      displayName: profile.displayName,
      email: profile.email,
      avatarUrl: profile.avatarUrl,
      updatedAt: profile.updatedAt,
    };
  }

  async getProfileByAccount(accountId: string) {
    const profile = await this.profileRepository.findOne({
      where: { accountId },
    });

    const onChain =
      await this.stellarProfileService.getOnChainProfile(accountId);

    if (!profile && !onChain) {
      throw new NotFoundException('Profile not found');
    }

    return {
      accountId,
      accountType: profile?.accountType ?? onChain?.type ?? null,
      dataHash: profile?.dataHash ?? onChain?.data_hash ?? null,
      onChain,
      offChain: profile?.profileJson ?? null,
      displayName: profile?.displayName ?? null,
      email: profile?.email ?? null,
      avatarUrl: profile?.avatarUrl ?? null,
      updatedAt: profile?.updatedAt ?? null,
    };
  }
}
