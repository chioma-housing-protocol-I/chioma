import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { Property } from '../properties/entities/property.entity';
import { User } from '../users/entities/user.entity';
import { RentAgreement } from '../rent/entities/rent-contract.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Property, User, RentAgreement])],
  providers: [SearchService],
  controllers: [SearchController],
  exports: [SearchService],
})
export class SearchModule {}
