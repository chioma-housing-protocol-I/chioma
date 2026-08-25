import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import {
  SearchService,
  SearchFilters,
  UserSearchFilters,
  DocumentSearchFilters,
} from './search.service';
import {
  SearchPropertiesDto,
  SearchUsersDto,
  SearchDocumentsDto,
  SuggestDto,
} from './dto';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('properties')
  @ApiOperation({ summary: 'Full-text property search with faceted filtering' })
  async searchProperties(@Query() query: SearchPropertiesDto) {
    const filters: SearchFilters = {
      query: query.q,
      city: query.city,
      state: query.state,
      country: query.country,
      type: query.type,
      status: query.status,
      minPrice: query.minPrice,
      maxPrice: query.maxPrice,
      bedrooms: query.bedrooms,
      bathrooms: query.bathrooms,
      isFurnished: query.furnished,
      hasParking: query.parking,
      petsAllowed: query.petsAllowed,
      amenities: query.amenities,
      lat: query.lat,
      lng: query.lng,
      radiusKm: query.radiusKm,
    };
    return this.searchService.searchProperties(
      filters,
      query.page,
      query.limit,
    );
  }

  @Get('users')
  @ApiOperation({ summary: 'Search users with filters' })
  async searchUsers(@Query() query: SearchUsersDto) {
    const filters: UserSearchFilters = {
      query: query.q,
      role: query.role,
      isActive: query.isActive,
      kycVerified: query.kycVerified,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    };
    return this.searchService.searchUsers(filters, query.page, query.limit);
  }

  @Get('documents')
  @ApiOperation({ summary: 'Search documents (agreements) with filters' })
  async searchDocuments(@Query() query: SearchDocumentsDto) {
    const filters: DocumentSearchFilters = {
      query: query.q,
      status: query.status,
      propertyId: query.propertyId,
      userId: query.userId,
      adminId: query.adminId,
      minRent: query.minRent,
      maxRent: query.maxRent,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    };
    return this.searchService.searchDocuments(
      filters,
      query.page,
      query.limit,
    );
  }

  @Get('suggest')
  @ApiOperation({ summary: 'Autocomplete suggestions for search' })
  async suggest(@Query() query: SuggestDto) {
    return this.searchService.suggest(query.q);
  }
}
