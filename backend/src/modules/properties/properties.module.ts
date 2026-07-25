import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { PropertiesController } from './properties.controller';
import { PropertyWizardController } from './property-wizard.controller';
import { PropertiesService } from './properties.service';
import { PropertyWizardService } from './property-wizard.service';
import { PropertyCacheWarmingService } from './property-cache-warming.service';
import { PropertyModesService } from './services/property-modes.service';
import { PropertyModesController } from './controllers/property-modes.controller';
import { CacheService } from '../../common/cache/cache.service';
import { Property } from './entities/property.entity';
import { PropertyImage } from './entities/property-image.entity';
import { PropertyAmenity } from './entities/property-amenity.entity';
import { RentalUnit } from './entities/rental-unit.entity';
import { PropertyListingDraft } from './entities/property-listing-draft.entity';
import { PropertyAvailability } from './entities/property-availability.entity';
import { AvailabilityService } from './availability.service';
import { AvailabilityController } from './availability.controller';
import { FraudModule } from '../fraud/fraud.module';

@Module({
  imports: [
    ScheduleModule,
    FraudModule,
    TypeOrmModule.forFeature([
      Property,
      PropertyImage,
      PropertyAmenity,
      RentalUnit,
      PropertyListingDraft,
      PropertyAvailability,
    ]),
  ],
  controllers: [
    PropertiesController,
    PropertyWizardController,
    PropertyModesController,
    AvailabilityController,
  ],
  providers: [
    PropertiesService,
    PropertyWizardService,
    PropertyCacheWarmingService,
    CacheService,
    PropertyModesService,
    AvailabilityService,
  ],
  exports: [
    PropertiesService,
    PropertyWizardService,
    PropertyModesService,
    AvailabilityService,
  ],
})
export class PropertiesModule {}
