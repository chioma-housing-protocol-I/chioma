import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Property, PropertyRentalMode } from '../entities/property.entity';
import {
  UpdatePropertyModeDto,
  SwitchModeDto,
} from '../dto/update-property-mode.dto';

@Injectable()
export class PropertyModesService {
  private readonly logger = new Logger(PropertyModesService.name);

  constructor(
    @InjectRepository(Property)
    private readonly propertyRepo: Repository<Property>,
  ) {}

  async getPropertyMode(propertyId: string) {
    const property = await this.findOrFail(propertyId);
    return {
      id: property.id,
      rentalMode: property.rentalMode,
      minStayDays: property.minStayDays,
      maxStayDays: property.maxStayDays,
      nightlyRate: property.nightlyRate,
      weeklyDiscount: property.weeklyDiscount,
      monthlyDiscount: property.monthlyDiscount,
      cleaningFee: property.cleaningFee,
      extraGuestFee: property.extraGuestFee,
      maxGuests: property.maxGuests,
      instantBooking: property.instantBooking,
      requireGuestVerification: property.requireGuestVerification,
      minimumGuestRating: property.minimumGuestRating,
      cancellationPolicy: property.cancellationPolicy,
      checkInTime: property.checkInTime,
      checkOutTime: property.checkOutTime,
      checkInMethod: property.checkInMethod,
      sublettingAllowed: property.sublettingAllowed,
      sublettingApprovalRequired: property.sublettingApprovalRequired,
      sublettingMaxDaysPerYear: property.sublettingMaxDaysPerYear,
      sublettingTenantShare: property.sublettingTenantShare,
      sublettingLandlordShare: property.sublettingLandlordShare,
      smokingAllowed: property.smokingAllowed,
      partiesAllowed: property.partiesAllowed,
      childrenAllowed: property.childrenAllowed,
      aiOptimalMode: property.aiOptimalMode,
      aiPricingSuggestion: property.aiPricingSuggestion,
      aiOccupancyPrediction: property.aiOccupancyPrediction,
    };
  }

  async updatePropertyMode(
    propertyId: string,
    dto: UpdatePropertyModeDto,
    userId: string,
  ): Promise<Property> {
    const property = await this.findOrFail(propertyId);
    this.assertOwner(property, userId);

    const targetMode = dto.rentalMode ?? property.rentalMode;
    this.validateModeSettings(targetMode, dto);

    Object.assign(property, dto);
    const saved = await this.propertyRepo.save(property);
    this.logger.log(
      `Property ${propertyId} mode updated to ${saved.rentalMode} by user ${userId}`,
    );
    return saved;
  }

  async getModeRecommendations(propertyId: string) {
    const property = await this.findOrFail(propertyId);

    // Rule-based AI recommendations (no external dependency)
    const recommendations = this.buildRecommendations(property);

    return {
      propertyId,
      currentMode: property.rentalMode,
      recommendations,
      aiOptimalMode: property.aiOptimalMode,
      aiPricingSuggestion: property.aiPricingSuggestion,
      aiOccupancyPrediction: property.aiOccupancyPrediction,
    };
  }

  async switchMode(
    propertyId: string,
    dto: SwitchModeDto,
    userId: string,
  ): Promise<Property> {
    const property = await this.findOrFail(propertyId);
    this.assertOwner(property, userId);

    if (property.rentalMode !== PropertyRentalMode.FLEXIBLE) {
      throw new BadRequestException(
        'Mode switching is only available for properties in FLEXIBLE mode. Update rentalMode to flexible first.',
      );
    }

    if (dto.newMode === property.rentalMode) {
      throw new BadRequestException('Property is already in this mode');
    }

    // Validate target mode has required fields
    this.validateModeSettings(dto.newMode, property as any);

    property.rentalMode = dto.newMode;
    const saved = await this.propertyRepo.save(property);
    this.logger.log(
      `Property ${propertyId} switched to ${dto.newMode} by user ${userId}`,
    );
    return saved;
  }

  // ─── Private helpers ─────────────────────────────────────────────────────────

  private async findOrFail(propertyId: string): Promise<Property> {
    const property = await this.propertyRepo.findOne({
      where: { id: propertyId },
    });
    if (!property)
      throw new NotFoundException(`Property ${propertyId} not found`);
    return property;
  }

  private assertOwner(property: Property, userId: string): void {
    if (property.ownerId !== userId) {
      throw new ForbiddenException('You do not own this property');
    }
  }

  private validateModeSettings(
    mode: PropertyRentalMode,
    dto: Partial<UpdatePropertyModeDto & Property>,
  ): void {
    if (
      mode === PropertyRentalMode.SHORT_TERM ||
      mode === PropertyRentalMode.HYBRID
    ) {
      if (!dto.nightlyRate && dto.nightlyRate !== 0) {
        throw new BadRequestException(
          'nightlyRate is required for short-term and hybrid modes',
        );
      }
      if (!dto.maxGuests) {
        throw new BadRequestException(
          'maxGuests is required for short-term and hybrid modes',
        );
      }
    }

    if (mode === PropertyRentalMode.HYBRID) {
      if (dto.sublettingAllowed === false) {
        throw new BadRequestException(
          'sublettingAllowed must be true for hybrid mode',
        );
      }
    }

    if (
      dto.sublettingTenantShare !== undefined &&
      dto.sublettingLandlordShare !== undefined
    ) {
      const total =
        Number(dto.sublettingTenantShare) + Number(dto.sublettingLandlordShare);
      if (total > 100) {
        throw new BadRequestException(
          'sublettingTenantShare + sublettingLandlordShare cannot exceed 100%',
        );
      }
    }
  }

  private buildRecommendations(property: Property) {
    const suggestions: Array<{
      mode: PropertyRentalMode;
      reason: string;
      estimatedRevenueLift: string;
    }> = [];

    if (property.rentalMode === PropertyRentalMode.LONG_TERM) {
      suggestions.push({
        mode: PropertyRentalMode.HYBRID,
        reason: 'Enable subletting to earn extra income during tenant absences',
        estimatedRevenueLift: '+15–25%',
      });
      suggestions.push({
        mode: PropertyRentalMode.FLEXIBLE,
        reason:
          'Switch between long-term and short-term based on market demand',
        estimatedRevenueLift: '+20–40%',
      });
    }

    if (property.rentalMode === PropertyRentalMode.SHORT_TERM) {
      suggestions.push({
        mode: PropertyRentalMode.FLEXIBLE,
        reason: 'Fall back to long-term during low-season to guarantee income',
        estimatedRevenueLift: 'Stable baseline',
      });
    }

    if (!property.instantBooking) {
      suggestions.push({
        mode: property.rentalMode,
        reason: 'Enable instant booking to increase booking conversion by ~30%',
        estimatedRevenueLift: '+10–15%',
      });
    }

    return suggestions;
  }
}
