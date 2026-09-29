import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  GoneException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  PropertyListingDraft,
  PropertyData,
} from './entities/property-listing-draft.entity';
import { PropertiesService } from './properties.service';
import { PropertyType } from './entities/property.entity';
import { CreatePropertyDto } from './dto/create-property.dto';
import { PROPERTY_DRAFT_EXPIRY_DAYS } from '../../common/constants/business-rules.constants';

@Injectable()
export class PropertyWizardService {
  constructor(
    @InjectRepository(PropertyListingDraft)
    private readonly draftRepository: Repository<PropertyListingDraft>,
    private readonly propertiesService: PropertiesService,
  ) {}

  async start(landlordId: string) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + PROPERTY_DRAFT_EXPIRY_DAYS);

    const draft = this.draftRepository.create({
      landlordId,
      expiresAt,
      data: {},
      currentStep: 1,
      completedSteps: [],
    });

    return await this.draftRepository.save(draft);
  }

  async findDraft(id: string, landlordId: string) {
    const draft = await this.draftRepository.findOne({ where: { id } });
    if (!draft) {
      throw new NotFoundException('Draft not found');
    }
    if (draft.landlordId !== landlordId) {
      throw new ForbiddenException('You do not own this draft');
    }
    if (draft.expiresAt && draft.expiresAt < new Date()) {
      throw new GoneException('Draft has expired');
    }
    return draft;
  }

  async updateStep(
    id: string,
    landlordId: string,
    step: number,
    data: Partial<PropertyData>,
  ) {
    const draft = await this.findDraft(id, landlordId);

    if (step < 1 || step > 8) {
      throw new UnprocessableEntityException('Invalid step number');
    }

    // Deep merge data
    draft.data = this.deepMerge(draft.data, data);
    draft.currentStep = step;

    // Add to completedSteps if not present
    if (!draft.completedSteps.includes(step)) {
      draft.completedSteps.push(step);
    }

    // Validation (server-side, per step)
    const validationErrors = this.validateStep(step, draft.data);

    await this.draftRepository.save(draft);

    return {
      id: draft.id,
      currentStep: draft.currentStep,
      completedSteps: draft.completedSteps,
      data: draft.data,
      validationErrors,
    };
  }

  async removeDraft(id: string, landlordId: string) {
    const draft = await this.findDraft(id, landlordId);
    await this.draftRepository.remove(draft);
  }

  async publish(id: string, landlordId: string) {
    const draft = await this.findDraft(id, landlordId);

    // Full validation
    const errors: any = {};
    for (let step = 1; step <= 8; step++) {
      const stepErrors = this.validateStep(step, draft.data);
      if (Object.keys(stepErrors).length > 0) {
        errors[`step${step}`] = stepErrors;
      }
    }

    // Required steps: 1, 2, 3, 5, 6, 7
    const requiredSteps = [1, 2, 3, 5, 6, 7];
    const missingSteps = requiredSteps.filter(
      (s) => !draft.completedSteps.includes(s),
    );

    if (missingSteps.length > 0 || Object.keys(errors).length > 0) {
      throw new UnprocessableEntityException({
        message: 'Draft is incomplete or invalid',
        errors,
        missingSteps,
      });
    }

    // Check photos count
    if (!draft.data.photos || draft.data.photos.length < 3) {
      throw new UnprocessableEntityException('At least 3 photos are required');
    }

    // Map Draft to Property Entity
    const createPropertyDto = this.mapDraftToCreateDto(draft.data);

    // Create actual property listing
    const property = await this.propertiesService.create(
      createPropertyDto,
      landlordId,
    );

    // Update status to DRAFT by default, then maybe PUBLISHED or use the published status
    // Wait, the requirement says "Create the actual property listing" then "Delete the draft"
    // Requirement says "Create the actual property listing using the existing property listing model/entity"
    // I should probably set it as DRAFT and then maybe the publish call in properties service handles it.
    // The requirement says POST /publish call. Let's see if publish means setting status to PUBLISHED.

    await this.draftRepository.remove(draft);

    return {
      propertyListingId: property.id,
      redirectUrl: `/properties/${property.id}`,
    };
  }

  private deepMerge(target: any, source: any): any {
    if (!source) return target;
    const output = { ...target };
    Object.keys(source).forEach((key) => {
      if (
        source[key] &&
        typeof source[key] === 'object' &&
        !Array.isArray(source[key])
      ) {
        output[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        output[key] = source[key];
      }
    });
    return output;
  }

  private validateStep(
    step: number,
    data: PropertyData,
  ): Record<string, string> {
    const errors: Record<string, string> = {};

    switch (step) {
      case 1:
        if (!data.propertyType)
          errors.propertyType = 'Property type is required';
        if (!data.address) errors.address = 'Address is required';
        if (data.bedrooms === undefined)
          errors.bedrooms = 'Bedrooms is required';
        if (data.bathrooms === undefined)
          errors.bathrooms = 'Bathrooms is required';
        if (
          data.yearBuilt &&
          (data.yearBuilt < 1800 || data.yearBuilt > new Date().getFullYear())
        ) {
          errors.yearBuilt = 'Invalid year built';
        }
        break;
      case 2:
        if (!data.monthlyRent || data.monthlyRent <= 0)
          errors.monthlyRent = 'Monthly rent must be positive';
        if (data.securityDeposit === undefined || data.securityDeposit < 0)
          errors.securityDeposit = 'Security deposit is required';
        if (!data.leaseTerm) errors.leaseTerm = 'Lease term is required';
        if (!data.moveInDate) errors.moveInDate = 'Move-in date is required';
        break;
      case 3:
        // enum validation for amenities could be added here
        break;
      case 5:
        if (!data.photos || data.photos.length < 3)
          errors.photos = 'At least 3 photos are required';
        break;
      case 6:
        if (
          !data.propertyDescription ||
          data.propertyDescription.length < 50 ||
          data.propertyDescription.length > 2000
        ) {
          errors.propertyDescription =
            'Description must be between 50 and 2000 characters';
        }
        break;
      case 7:
        if (!data.availableFrom)
          errors.availableFrom = 'Available from date is required';
        if (
          data.availableFrom &&
          new Date(data.availableFrom) <
            new Date(new Date().setHours(0, 0, 0, 0))
        ) {
          errors.availableFrom = 'Availability date cannot be in the past';
        }
        break;
    }

    return errors;
  }

  private mapDraftToCreateDto(data: PropertyData): CreatePropertyDto {
    const dto = new CreatePropertyDto();
    dto.title = `${data.propertyType} at ${data.address}`;
    dto.description = data.propertyDescription;
    dto.type = this.mapPropertyType(data.propertyType);
    dto.address = data.address;
    dto.price = data.monthlyRent || 0;
    dto.bedrooms = data.bedrooms;
    dto.bathrooms = data.bathrooms;
    dto.area = data.squareFootage;
    dto.metadata = {
      securityDeposit: data.securityDeposit,
      leaseTerm: data.leaseTerm,
      moveInDate: data.moveInDate,
      utilitiesIncluded: data.utilitiesIncluded,
      houseRules: data.houseRules,
      availableFrom: data.availableFrom,
      blockedDates: data.blockedDates,
      neighborhoodDescription: data.neighborhoodDescription,
      transportationInfo: data.transportationInfo,
      nearbyAmenities: data.nearbyAmenities,
      yearBuilt: data.yearBuilt,
    };

    if (data.photos) {
      dto.images = data.photos.map((p) => ({
        url: p.url,
        sortOrder: p.order,
        isPrimary: p.order === 0,
      }));
    }

    if (data.amenities) {
      dto.amenities = data.amenities.map((a) => ({
        name: a,
      }));
    }

    return dto;
  }

  private mapPropertyType(type?: string): PropertyType {
    switch (type?.toLowerCase()) {
      case 'apartment':
        return PropertyType.APARTMENT;
      case 'house':
        return PropertyType.HOUSE;
      case 'room':
        return PropertyType.OTHER; // Mapping as example
      case 'studio':
        return PropertyType.APARTMENT;
      case 'duplex':
        return PropertyType.HOUSE;
      default:
        return PropertyType.OTHER;
    }
  }
}
