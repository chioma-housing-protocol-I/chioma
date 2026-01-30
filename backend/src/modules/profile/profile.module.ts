import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { SorobanClientService } from '../../common/services/soroban-client.service';
import { ProfileContractService } from '../../blockchain/profile/profile.service';
import { IpfsService } from './services/ipfs.service';
import { ProfileMetadata } from './entities/profile-metadata.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ProfileMetadata, User])],
  controllers: [ProfileController],
  providers: [
    ProfileService,
    SorobanClientService,
    ProfileContractService,
    IpfsService,
  ],
  exports: [ProfileService, ProfileContractService, IpfsService],
})
export class ProfileModule {}
