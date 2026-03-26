import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import { Repository } from 'typeorm';
import {
  Property,
  ListingStatus,
  PropertyType,
} from './entities/property.entity';
import { PropertyListingDraft } from './entities/property-listing-draft.entity';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyListingWizardStepDto } from './dto/property-listing-wizard.dto';
import { PropertyImage } from './entities/property-image.entity';
import { PropertyAmenity } from './entities/property-amenity.entity';
import { RentalUnit } from './entities/rental-unit.entity';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { QueryPropertyDto } from './dto/query-property.dto';
import { User, UserRole } from '../users/entities/user.entity';
import { PropertyQueryBuilder } from './property-query-builder';
import { CacheService } from '../../common/cache/cache.service';
import {
  CACHE_PREFIX_PROPERTIES_LIST,
  TTL_PUBLIC_PROPERTY_LIST_MS,
} from '../../common/cache/cache.constants';

@Injectable()
export class PropertiesService {

  constructor(
    @InjectRepository(Property)
    private readonly propertyRepository: Repository<Property>,
    @InjectRepository(PropertyImage)
    private readonly imageRepository: Repository<PropertyImage>,
    @InjectRepository(PropertyAmenity)
    private readonly amenityRepository: Repository<PropertyAmenity>,
    @InjectRepository(RentalUnit)
    private readonly rentalUnitRepository: Repository<RentalUnit>,
    @InjectRepository(PropertyListingDraft)
    private readonly propertyListingDraftRepository: Repository<PropertyListingDraft>,
    private readonly cacheService: CacheService,
  ) { }

  private generateCacheKey(query: QueryPropertyDto): string {
    const queryStr = JSON.stringify(query);
    const hash = crypto.createHash('md5').update(queryStr).digest('hex');
    return `${CACHE_PREFIX_PROPERTIES_LIST}:${hash}`;
  }

  async create(
    createPropertyDto: CreatePropertyDto,
    ownerId: string,
  ): Promise<Property> {
    const { images, amenities, rentalUnits, ...propertyData } =
      createPropertyDto;

    const property = this.propertyRepository.create({
      ...propertyData,
      ownerId,
      status: ListingStatus.DRAFT,
    });

    const savedProperty = await this.propertyRepository.save(property);

    if (images && images.length > 0) {
      const propertyImages = images.map((img) =>
        this.imageRepository.create({
          ...img,
          propertyId: savedProperty.id,
        }),
      );
      await this.imageRepository.save(propertyImages);
    }

    if (amenities && amenities.length > 0) {
      const propertyAmenities = amenities.map((amenity) =>
        this.amenityRepository.create({
          ...amenity,
          propertyId: savedProperty.id,
        }),
      );
      await this.amenityRepository.save(propertyAmenities);
    }

    if (rentalUnits && rentalUnits.length > 0) {
      const propertyUnits = rentalUnits.map((unit) =>
        this.rentalUnitRepository.create({
          ...unit,
          propertyId: savedProperty.id,
        }),
      );
      await this.rentalUnitRepository.save(propertyUnits);
    }

    await this.cacheService.invalidatePropertyDomainCaches(savedProperty.id);
    return this.findOne(savedProperty.id);
  }

  async findAll(query: QueryPropertyDto): Promise<{
    data: Property[];
    meta: {
      total: number;
      page: number;
      limit: number;
    };
  }> {
    const isPublicListing =
      query.status === ListingStatus.PUBLISHED && !query.ownerId;

    if (isPublicListing) {
      const cacheKey = this.generateCacheKey(query);
      return this.cacheService.getOrSet(
        cacheKey,
        () => this.fetchListingsPage(query),
        TTL_PUBLIC_PROPERTY_LIST_MS,
      );
    }

    return this.fetchListingsPage(query);
  }

  private async fetchListingsPage(query: QueryPropertyDto): Promise<{
    data: Property[];
    meta: {
      total: number;
      page: number;
      limit: number;
    };
  }> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      ...filters
    } = query;

    const baseQuery = this.propertyRepository
      .createQueryBuilder('property')
      .leftJoinAndSelect('property.images', 'images')
      .leftJoinAndSelect('property.amenities', 'amenities')
      .leftJoinAndSelect('property.owner', 'owner');

    const propertyQueryBuilder = new PropertyQueryBuilder(baseQuery);

    const [data, total] = await propertyQueryBuilder
      .applyFilters(filters)
      .applySorting(sortBy, sortOrder)
      .applyPagination(page, limit)
      .execute();

    return {
      data,
      meta: {
        total,
        page,
        limit,
      },
    };
  }

  async findOne(id: string): Promise<Property> {
    const property = await this.propertyRepository.findOne({
      where: { id },
      relations: ['images', 'amenities', 'rentalUnits', 'owner'],
    });

    if (!property) {
      throw new NotFoundException(`Property with ID ${id} not found`);
    }

    return property;
  }

  async findOnePublic(id: string): Promise<Property> {
    const property = await this.findOne(id);

    if (property.status !== ListingStatus.PUBLISHED) {
      throw new NotFoundException(`Property with ID ${id} not found`);
    }

    return property;
  }

  async update(
    id: string,
    updatePropertyDto: UpdatePropertyDto,
    user: User,
  ): Promise<Property> {
    const property = await this.findOne(id);
    this.verifyOwnership(property, user);

    const { images, amenities, rentalUnits, ...propertyData } =
      updatePropertyDto;

    Object.assign(property, propertyData);
    await this.propertyRepository.save(property);

    if (images !== undefined) {
      await this.imageRepository.delete({ propertyId: id });
      if (images.length > 0) {
        const propertyImages = images.map((img) =>
          this.imageRepository.create({
            ...img,
            propertyId: id,
          }),
        );
        await this.imageRepository.save(propertyImages);
      }
    }

    if (amenities !== undefined) {
      await this.amenityRepository.delete({ propertyId: id });
      if (amenities.length > 0) {
        const propertyAmenities = amenities.map((amenity) =>
          this.amenityRepository.create({
            ...amenity,
            propertyId: id,
          }),
        );
        await this.amenityRepository.save(propertyAmenities);
      }
    }

    if (rentalUnits !== undefined) {
      await this.rentalUnitRepository.delete({ propertyId: id });
      if (rentalUnits.length > 0) {
        const propertyUnits = rentalUnits.map((unit) =>
          this.rentalUnitRepository.create({
            ...unit,
            propertyId: id,
          }),
        );
        await this.rentalUnitRepository.save(propertyUnits);
      }
    }

    await this.cacheService.invalidatePropertyDomainCaches(id);
    return this.findOne(id);
  }

  async remove(id: string, user: User): Promise<void> {
    const property = await this.findOne(id);
    this.verifyOwnership(property, user);
    await this.propertyRepository.remove(property);
    await this.cacheService.invalidatePropertyDomainCaches(id);
  }

  async publish(id: string, user: User): Promise<Property> {
    const property = await this.findOne(id);
    this.verifyOwnership(property, user);

    if (property.status === ListingStatus.PUBLISHED) {
      throw new BadRequestException('Property is already published');
    }

    if (property.status === ListingStatus.ARCHIVED) {
      throw new BadRequestException(
        'Cannot publish an archived property. Please create a new listing.',
      );
    }

    if (
      !property.title ||
      property.price === null ||
      property.price === undefined
    ) {
      throw new BadRequestException(
        'Property must have at least a title and price to be published',
      );
    }

    property.status = ListingStatus.PUBLISHED;
    const saved = await this.propertyRepository.save(property);
    await this.cacheService.invalidatePropertyDomainCaches(id);
    return saved;
  }

  async archive(id: string, user: User): Promise<Property> {
    const property = await this.findOne(id);
    this.verifyOwnership(property, user);
    property.status = ListingStatus.ARCHIVED;
    const saved = await this.propertyRepository.save(property);
    await this.cacheService.invalidatePropertyDomainCaches(id);
    return saved;
  }

  async markAsRented(id: string, user: User): Promise<Property> {
    const property = await this.findOne(id);
    this.verifyOwnership(property, user);
    property.status = ListingStatus.RENTED;
    const saved = await this.propertyRepository.save(property);
    await this.cacheService.invalidatePropertyDomainCaches(id);
    return saved;
  }

  async startWizard(
    landlordId: string,
    data: Record<string, unknown> = {},
  ): Promise<PropertyListingDraft> {
    const draft = this.propertyListingDraftRepository.create({
      landlordId,
      data,
      currentStep: 1,
      completedSteps: [],
    });
    return this.propertyListingDraftRepository.save(draft);
  }

  async updateWizardStep(
    draftId: string,
    landlordId: string,
    body: UpdatePropertyListingWizardStepDto,
  ): Promise<PropertyListingDraft> {
    const draft = await this.requireDraftForLandlord(draftId, landlordId);
    draft.data = { ...draft.data, ...body.data };
    draft.currentStep = body.step;
    const mergedData = { ...draft.data, ...body.data };
    const completed = new Set([
      ...(draft.completedSteps ?? []),
      ...(body.completedSteps ?? []),
    ]);
    draft.data = mergedData;
    draft.currentStep = body.step;
    draft.completedSteps = Array.from(completed).sort((a, b) => a - b);
    return this.propertyListingDraftRepository.save(draft);
  }

  async getWizardDraft(
    draftId: string,
    landlordId: string,
  ): Promise<PropertyListingDraft> {
    return this.requireDraftForLandlord(draftId, landlordId);
  }

  async deleteWizardDraft(draftId: string, landlordId: string): Promise<void> {
    const draft = await this.requireDraftForLandlord(draftId, landlordId);
    await this.propertyListingDraftRepository.remove(draft);
  }

  async publishWizardDraft(
    draftId: string,
    landlordId: string,
  ): Promise<Property> {
    const draft = await this.requireDraftForLandlord(draftId, landlordId);
    const createDto = this.buildCreateDtoFromWizardData(draft.data);
    const property = await this.create(createDto, landlordId);
    const published = await this.publish(property.id, {
      id: landlordId,
      role: UserRole.LANDLORD,
    } as User);
    await this.propertyListingDraftRepository.remove(draft);
    return published;
  }

  private async requireDraftForLandlord(
    draftId: string,
    landlordId: string,
  ): Promise<PropertyListingDraft> {
    const draft = await this.propertyListingDraftRepository.findOne({
      where: { id: draftId, landlordId },
    });
    if (!draft) {
      throw new NotFoundException(`Wizard draft ${draftId} not found`);
    }
    return draft;
  }

  private buildCreateDtoFromWizardData(
    data: Record<string, unknown>,
  ): CreatePropertyDto {
    const basic = (data.basicInfo as Record<string, unknown>) || {};
    const pricing = (data.pricing as Record<string, unknown>) || {};
    const title =
      (data.title as string) ||
      (basic.title as string) ||
      (data.name as string) ||
      '';
    const priceRaw =
      data.price ?? pricing.monthlyRent ?? basic.price ?? pricing.rent;
    const price = Number(priceRaw);
    if (!String(title).trim()) {
      throw new BadRequestException(
        'Wizard draft must include a title before publishing.',
      );
    }
    if (!Number.isFinite(price) || price < 0) {
      throw new BadRequestException(
        'Wizard draft must include a valid price before publishing.',
      );
    }
    const typeRaw = basic.type ?? data.type;
    const type =
      typeRaw !== undefined &&
        typeRaw !== null &&
        Object.values(PropertyType).includes(typeRaw as PropertyType)
        ? (typeRaw as PropertyType)
        : PropertyType.APARTMENT;

    return {
      title: String(title).trim(),
      price,
      description:
        (data.description as string) || (basic.description as string),
      type,
      latitude: (data.latitude as number) ?? (basic.latitude as number),
      longitude: (data.longitude as number) ?? (basic.longitude as number),
      address: (data.address as string) || (basic.address as string),
      city: (data.city as string) || (basic.city as string),
      state: (data.state as string) || (basic.state as string),
      postalCode: (data.postalCode as string) || (basic.postalCode as string),
      country: (data.country as string) || (basic.country as string),
      currency: (data.currency as string) || (pricing.currency as string),
      bedrooms: (data.bedrooms as number) ?? (basic.bedrooms as number),
      bathrooms: (data.bathrooms as number) ?? (basic.bathrooms as number),
      area: (data.area as number) ?? (basic.area as number),
      floor: (data.floor as number) ?? (basic.floor as number),
      isFurnished:
        (data.isFurnished as boolean) ?? (basic.isFurnished as boolean),
      hasParking: (data.hasParking as boolean) ?? (basic.hasParking as boolean),
      petsAllowed:
        (data.petsAllowed as boolean) ?? (basic.petsAllowed as boolean),
      metadata:
        (data.metadata as Record<string, unknown>) ||
        (basic.metadata as Record<string, unknown>),
      images: data.images as CreatePropertyDto['images'],
      amenities: data.amenities as CreatePropertyDto['amenities'],
      rentalUnits: data.rentalUnits as CreatePropertyDto['rentalUnits'],
    };
  }

  private verifyOwnership(property: Property, user: User): void {
    if (property.ownerId !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'You do not have permission to modify this property',
      );
    }
  }
}
