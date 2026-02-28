import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { SearchService, SearchFilters } from './search.service';
import {
  PropertyType,
  ListingStatus,
} from '../properties/entities/property.entity';

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
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('radiusKm') radiusKm?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
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

  @Get('suggest')
  @ApiOperation({ summary: 'Autocomplete suggestions for search' })
  @ApiQuery({ name: 'q', required: true })
  async suggest(@Query('q') q: string) {
    return this.searchService.suggest(q);
  }
}
