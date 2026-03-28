import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { PropertiesController } from './properties.controller';
import { PropertiesService } from './properties.service';
import { PropertyCacheWarmingService } from './property-cache-warming.service';
import { PropertyModesService } from './services/property-modes.service';
import { PropertyModesController } from './controllers/property-modes.controller';
import { Property } from './entities/property.entity';
import { PropertyImage } from './entities/property-image.entity';
import { PropertyAmenity } from './entities/property-amenity.entity';
import { RentalUnit } from './entities/rental-unit.entity';
import { PropertyListingDraft } from './entities/property-listing-draft.entity';
import { CacheService } from '../../common/cache/cache.service';

@Module({
  imports: [
    ScheduleModule,
    TypeOrmModule.forFeature([
      Property,
      PropertyImage,
      PropertyAmenity,
      RentalUnit,
      PropertyListingDraft,
    ]),
  ],
  controllers: [PropertiesController, PropertyModesController],
  providers: [
    PropertiesService,
    PropertyCacheWarmingService,
    CacheService,
    PropertyModesService,
  ],
  exports: [PropertiesService, PropertyModesService],
})
export class PropertiesModule {}
