import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import {
  SearchService,
  SearchFilters,
  UserSearchFilters,
  DocumentSearchFilters,
} from './search.service';
import {
  PropertyType,
  ListingStatus,
} from '../properties/entities/property.entity';
import { UserRole } from '../users/entities/user.entity';
import { AgreementStatus } from '../rent/entities/rent-contract.entity';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('properties')
  @ApiOperation({ summary: 'Full-text property search with faceted filtering' })
  @ApiQuery({ name: 'q', required: false })
  @ApiQuery({ name: 'city', required: false })
  @ApiQuery({ name: 'type', required: false, enum: PropertyType })
  @ApiQuery({ name: 'minPrice', required: false })
  @ApiQuery({ name: 'maxPrice', required: false })
  @ApiQuery({ name: 'bedrooms', required: false })
  @ApiQuery({ name: 'lat', required: false })
  @ApiQuery({ name: 'lng', required: false })
  @ApiQuery({ name: 'radiusKm', required: false })
  @ApiQuery({ name: 'amenities', required: false, isArray: true })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async searchProperties(
    @Query('q') query?: string,
    @Query('city') city?: string,
    @Query('state') state?: string,
    @Query('country') country?: string,
    @Query('type') type?: PropertyType,
    @Query('status') status?: ListingStatus,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('bedrooms') bedrooms?: string,
    @Query('bathrooms') bathrooms?: string,
    @Query('furnished') furnished?: string,
    @Query('parking') parking?: string,
    @Query('petsAllowed') petsAllowed?: string,
    @Query('amenities') amenities?: string | string[],
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('radiusKm') radiusKm?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const amenityList = amenities
      ? Array.isArray(amenities)
        ? amenities
        : amenities.split(',').map((a) => a.trim())
      : undefined;

    const filters: SearchFilters = {
      query,
      city,
      state,
      country,
      type,
      status,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      bedrooms: bedrooms ? parseInt(bedrooms) : undefined,
      bathrooms: bathrooms ? parseInt(bathrooms) : undefined,
      isFurnished: furnished !== undefined ? furnished === 'true' : undefined,
      hasParking: parking !== undefined ? parking === 'true' : undefined,
      petsAllowed:
        petsAllowed !== undefined ? petsAllowed === 'true' : undefined,
      amenities: amenityList,
      lat: lat ? parseFloat(lat) : undefined,
      lng: lng ? parseFloat(lng) : undefined,
      radiusKm: radiusKm ? parseFloat(radiusKm) : undefined,
    };
    return this.searchService.searchProperties(
      filters,
      page ? parseInt(page) : 1,
      limit ? Math.min(parseInt(limit), 100) : 20,
    );
  }

  @Get('users')
  @ApiOperation({ summary: 'Search users with filters' })
  @ApiQuery({ name: 'q', required: false })
  @ApiQuery({ name: 'role', required: false, enum: UserRole })
  @ApiQuery({ name: 'isActive', required: false })
  @ApiQuery({ name: 'kycVerified', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'sortBy', required: false })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  async searchUsers(
    @Query('q') query?: string,
    @Query('role') role?: UserRole,
    @Query('isActive') isActive?: string,
    @Query('kycVerified') kycVerified?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    const filters: UserSearchFilters = {
      query,
      role,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      kycVerified:
        kycVerified !== undefined ? kycVerified === 'true' : undefined,
      sortBy,
      sortOrder,
    };
    return this.searchService.searchUsers(
      filters,
      page ? parseInt(page) : 1,
      limit ? Math.min(parseInt(limit), 100) : 20,
    );
  }

  @Get('documents')
  @ApiOperation({ summary: 'Search documents (agreements) with filters' })
  @ApiQuery({ name: 'q', required: false })
  @ApiQuery({ name: 'status', required: false, enum: AgreementStatus })
  @ApiQuery({ name: 'propertyId', required: false })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'adminId', required: false })
  @ApiQuery({ name: 'minRent', required: false })
  @ApiQuery({ name: 'maxRent', required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'sortBy', required: false })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  async searchDocuments(
    @Query('q') query?: string,
    @Query('status') status?: AgreementStatus,
    @Query('propertyId') propertyId?: string,
    @Query('userId') userId?: string,
    @Query('adminId') adminId?: string,
    @Query('minRent') minRent?: string,
    @Query('maxRent') maxRent?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    const filters: DocumentSearchFilters = {
      query,
      status,
      propertyId,
      userId,
      adminId,
      minRent: minRent ? parseFloat(minRent) : undefined,
      maxRent: maxRent ? parseFloat(maxRent) : undefined,
      dateFrom,
      dateTo,
      sortBy,
      sortOrder,
    };
    return this.searchService.searchDocuments(
      filters,
      page ? parseInt(page) : 1,
      limit ? Math.min(parseInt(limit), 100) : 20,
    );
  }

  @Get('suggest')
  @ApiOperation({ summary: 'Autocomplete suggestions for search' })
  @ApiQuery({ name: 'q', required: true })
  async suggest(@Query('q') q: string) {
    return this.searchService.suggest(q);
  }
}
