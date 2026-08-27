import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { UseReplica } from '../../common/decorators/use-replica.decorator';
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
  @UseReplica({
    maxStaleness: '30s',
    reason: 'Property search results tolerate brief replication lag',
  })
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
  @UseReplica({
    maxStaleness: '1m',
    reason: 'User search results tolerate brief replication lag',
  })
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
  @UseReplica({
    maxStaleness: '1m',
    reason: 'Document search results tolerate brief replication lag',
  })
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
    return this.searchService.searchDocuments(filters, query.page, query.limit);
  }

  @Get('suggest')
  @UseReplica({
    maxStaleness: '5m',
    reason: 'Autocomplete suggestions tolerate staleness',
  })
  @ApiOperation({ summary: 'Autocomplete suggestions for search' })
  async suggest(@Query() query: SuggestDto) {
    return this.searchService.suggest(query.q);
  }
}
