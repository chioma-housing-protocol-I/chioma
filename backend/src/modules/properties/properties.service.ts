import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import * as crypto from 'crypto';
import { Repository } from 'typeorm';
import { Property, ListingStatus } from './entities/property.entity';
import { PropertyImage } from './entities/property-image.entity';
import { PropertyAmenity } from './entities/property-amenity.entity';
import { RentalUnit } from './entities/rental-unit.entity';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { QueryPropertyDto } from './dto/query-property.dto';
import { User, UserRole } from '../users/entities/user.entity';

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
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  private async clearPropertiesCache(): Promise<void> {
    const store = (this.cacheManager as any).store;
    if (store.keys) {
      const keys = await store.keys('properties:list:*');
      for (const key of keys) {
        await this.cacheManager.del(key);
      }
    }
  }

  private generateCacheKey(query: QueryPropertyDto): string {
    const queryStr = JSON.stringify(query);
    const hash = crypto.createHash('md5').update(queryStr).digest('hex');
    return `properties:list:${hash}`;
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

    await this.clearPropertiesCache();
    return this.findOne(savedProperty.id);
  }

  async findAll(query: QueryPropertyDto): Promise<{
    data: Property[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      ...filters
    } = query;

    // Caching logic
    const isPublicListing =
      filters.status === ListingStatus.PUBLISHED && !filters.ownerId;
    let cacheKey: string | null = null;

    if (isPublicListing) {
      cacheKey = this.generateCacheKey(query);
      const cachedData = await this.cacheManager.get<{
        data: Property[];
        total: number;
        page: number;
        limit: number;
      }>(cacheKey);

      if (cachedData) {
        return cachedData;
      }
    }

    const queryBuilder = this.propertyRepository
      .createQueryBuilder('property')
      .leftJoinAndSelect('property.images', 'images')
      .leftJoinAndSelect('property.amenities', 'amenities')
      .leftJoinAndSelect('property.owner', 'owner');

    if (filters.type) {
      queryBuilder.andWhere('property.type = :type', { type: filters.type });
    }

    if (filters.status) {
      queryBuilder.andWhere('property.status = :status', {
        status: filters.status,
      });
    }

    if (filters.minPrice !== undefined) {
      queryBuilder.andWhere('property.price >= :minPrice', {
        minPrice: filters.minPrice,
      });
    }

    if (filters.maxPrice !== undefined) {
      queryBuilder.andWhere('property.price <= :maxPrice', {
        maxPrice: filters.maxPrice,
      });
    }

    if (filters.minBedrooms !== undefined) {
      queryBuilder.andWhere('property.bedrooms >= :minBedrooms', {
        minBedrooms: filters.minBedrooms,
      });
    }

    if (filters.maxBedrooms !== undefined) {
      queryBuilder.andWhere('property.bedrooms <= :maxBedrooms', {
        maxBedrooms: filters.maxBedrooms,
      });
    }

    if (filters.minBathrooms !== undefined) {
      queryBuilder.andWhere('property.bathrooms >= :minBathrooms', {
        minBathrooms: filters.minBathrooms,
      });
    }

    if (filters.maxBathrooms !== undefined) {
      queryBuilder.andWhere('property.bathrooms <= :maxBathrooms', {
        maxBathrooms: filters.maxBathrooms,
      });
    }

    if (filters.city) {
      queryBuilder.andWhere('property.city ILIKE :city', {
        city: filters.city,
      });
    }

    if (filters.state) {
      queryBuilder.andWhere('property.state ILIKE :state', {
        state: filters.state,
      });
    }

    if (filters.country) {
      queryBuilder.andWhere('property.country ILIKE :country', {
        country: filters.country,
      });
    }

    if (filters.ownerId) {
      queryBuilder.andWhere('property.ownerId = :ownerId', {
        ownerId: filters.ownerId,
      });
    }

    if (filters.search) {
      queryBuilder.andWhere(
        '(property.title ILIKE :search OR property.description ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    if (filters.amenities && filters.amenities.length > 0) {
      const amenityParams = Object.fromEntries(
        filters.amenities.map((a, i) => [`amenity${i}`, a]),
      );
      const amenityConditions = filters.amenities
        .map((_, i) => `pa.name ILIKE :amenity${i}`)
        .join(' OR ');
      queryBuilder.andWhere(
        `EXISTS (SELECT 1 FROM property_amenities pa WHERE pa.property_id = property.id AND (${amenityConditions}))`,
        amenityParams,
      );
    }

    const validSortFields = [
      'createdAt',
      'updatedAt',
      'price',
      'bedrooms',
      'bathrooms',
      'area',
      'title',
    ];
    const actualSortBy = validSortFields.includes(sortBy)
      ? sortBy
      : 'createdAt';
    queryBuilder.orderBy(`property.${actualSortBy}`, sortOrder);

    const [data, total] = await queryBuilder.getManyAndCount();

    const result = {
      data,
      total,
      page,
      limit,
    };

    if (isPublicListing && cacheKey) {
      await this.cacheManager.set(cacheKey, result, 900); // 15 minutes
    }

    return result;
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

    await this.clearPropertiesCache();
    return this.findOne(id);
  }

  async remove(id: string, user: User): Promise<void> {
    const property = await this.findOne(id);
    this.verifyOwnership(property, user);
    await this.propertyRepository.remove(property);
    await this.clearPropertiesCache();
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
    await this.clearPropertiesCache();
    return saved;
  }

  async archive(id: string, user: User): Promise<Property> {
    const property = await this.findOne(id);
    this.verifyOwnership(property, user);
    property.status = ListingStatus.ARCHIVED;
    const saved = await this.propertyRepository.save(property);
    await this.clearPropertiesCache();
    return saved;
  }

  async markAsRented(id: string, user: User): Promise<Property> {
    const property = await this.findOne(id);
    this.verifyOwnership(property, user);
    property.status = ListingStatus.RENTED;
    const saved = await this.propertyRepository.save(property);
    await this.clearPropertiesCache();
    return saved;
  }

  private verifyOwnership(property: Property, user: User): void {
    if (property.ownerId !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'You do not have permission to modify this property',
      );
    }
  }
}
