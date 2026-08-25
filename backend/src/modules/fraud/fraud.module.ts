import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from '../payments/entities/payment.entity';
import { Property } from '../properties/entities/property.entity';
import { User } from '../users/entities/user.entity';
import { FraudAlertEntity } from './entities/fraud-alert.entity';
import { FraudThresholds } from './entities/fraud-thresholds.entity';
import { FraudAlertsService } from './fraud-alerts.service';
import { FraudController } from './fraud.controller';
import { FraudFeatureExtractionService } from './fraud-feature-extraction.service';
import { FraudHooksService } from './fraud-hooks.service';
import { FraudModelService } from './fraud-model.service';
import { FraudThresholdsService } from './fraud-thresholds.service';
import { FraudService } from './fraud.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Property,
      Payment,
      FraudAlertEntity,
      FraudThresholds,
    ]),
    AuditModule,
  ],
  controllers: [FraudController],
  providers: [
    FraudService,
    FraudFeatureExtractionService,
    FraudModelService,
    FraudThresholdsService,
    FraudAlertsService,
    FraudHooksService,
  ],
  exports: [FraudService, FraudHooksService, FraudThresholdsService],
})
export class FraudModule {}
