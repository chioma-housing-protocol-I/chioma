import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SavedSearch } from './entities/saved-search.entity';
import {
  Property,
  ListingStatus,
} from '../properties/entities/property.entity';
import { SearchFilters } from './search.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateSavedSearchDto, SavedSearchDto } from './dto/saved-search.dto';

function toDto(entity: SavedSearch): SavedSearchDto {
  return {
    id: entity.id,
    name: entity.name,
    filters: entity.filters,
    alertsEnabled: entity.alertsEnabled,
    lastNotifiedAt: entity.lastNotifiedAt
      ? entity.lastNotifiedAt.toISOString()
      : null,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
}

/** Checks whether a single published property satisfies a saved filter set. */
export function propertyMatchesFilters(
  property: Property,
  filters: SearchFilters,
): boolean {
  if (filters.query) {
    const q = filters.query.toLowerCase();
    const haystack =
      `${property.title} ${property.address ?? ''} ${property.city ?? ''}`.toLowerCase();
    if (!haystack.includes(q)) return false;
  }
  if (
    filters.city &&
    !property.city?.toLowerCase().includes(filters.city.toLowerCase())
  ) {
    return false;
  }
  if (
    filters.state &&
    !property.state?.toLowerCase().includes(filters.state.toLowerCase())
  ) {
    return false;
  }
  if (filters.country && property.country !== filters.country) {
    return false;
  }
  if (filters.type && property.type !== filters.type) {
    return false;
  }
  const status = filters.status ?? ListingStatus.PUBLISHED;
  if (property.status !== status) {
    return false;
  }
  if (
    filters.minPrice !== undefined &&
    Number(property.price) < filters.minPrice
  ) {
    return false;
  }
  if (
    filters.maxPrice !== undefined &&
    Number(property.price) > filters.maxPrice
  ) {
    return false;
  }
  if (
    filters.bedrooms !== undefined &&
    (property.bedrooms ?? 0) < filters.bedrooms
  ) {
    return false;
  }
  if (
    filters.bathrooms !== undefined &&
    (property.bathrooms ?? 0) < filters.bathrooms
  ) {
    return false;
  }
  if (
    filters.isFurnished !== undefined &&
    property.isFurnished !== filters.isFurnished
  ) {
    return false;
  }
  if (
    filters.hasParking !== undefined &&
    property.hasParking !== filters.hasParking
  ) {
    return false;
  }
  if (
    filters.petsAllowed !== undefined &&
    property.petsAllowed !== filters.petsAllowed
  ) {
    return false;
  }
  if (filters.amenities && filters.amenities.length > 0) {
    const propertyAmenityNames = new Set(
      (property.amenities ?? []).map((a) => a.name?.toLowerCase()),
    );
    const hasAll = filters.amenities.every((name) =>
      propertyAmenityNames.has(name.toLowerCase()),
    );
    if (!hasAll) return false;
  }

  return true;
}

@Injectable()
export class SavedSearchService {
  private readonly logger = new Logger(SavedSearchService.name);

  constructor(
    @InjectRepository(SavedSearch)
    private readonly savedSearchRepository: Repository<SavedSearch>,
    @InjectRepository(Property)
    private readonly propertyRepository: Repository<Property>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(
    userId: string,
    dto: CreateSavedSearchDto,
  ): Promise<SavedSearchDto> {
    const savedSearch = this.savedSearchRepository.create({
      userId,
      name: dto.name,
      filters: dto.filters as SearchFilters,
      alertsEnabled: dto.alertsEnabled ?? true,
    });
    const saved = await this.savedSearchRepository.save(savedSearch);
    return toDto(saved);
  }

  async findAllForUser(userId: string): Promise<SavedSearchDto[]> {
    const savedSearches = await this.savedSearchRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    return savedSearches.map(toDto);
  }

  async remove(userId: string, id: string): Promise<void> {
    const result = await this.savedSearchRepository.delete({ id, userId });
    if (result.affected === 0) {
      throw new NotFoundException(`Saved search ${id} not found`);
    }
  }

  /**
   * Finds saved searches matching a newly published property and notifies
   * their owners. Never throws — failures are logged only so a listing
   * publish never fails because of the alerting side-effect.
   */
  async notifyMatchingSearches(property: Property): Promise<number> {
    try {
      const candidates = await this.savedSearchRepository.find({
        where: { alertsEnabled: true },
      });

      const matches = candidates.filter((saved) =>
        propertyMatchesFilters(property, saved.filters),
      );

      for (const match of matches) {
        await this.notifySavedSearchOwner(match, property);
      }

      return matches.length;
    } catch (err) {
      this.logger.warn(
        `Saved search matching failed for property ${property.id} (non-fatal): ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      return 0;
    }
  }

  /**
   * Fallback sweep for any recently published listings that weren't caught
   * by the publish-time hook (e.g. after a deploy or a transient failure).
   */
  async notifyForRecentListings(sinceMinutes: number): Promise<number> {
    const since = new Date(Date.now() - sinceMinutes * 60_000);
    const recentlyPublished = await this.propertyRepository
      .createQueryBuilder('property')
      .leftJoinAndSelect('property.amenities', 'amenities')
      .where('property.status = :status', { status: ListingStatus.PUBLISHED })
      .andWhere('property.updatedAt >= :since', { since })
      .getMany();

    let notified = 0;
    for (const property of recentlyPublished) {
      notified += await this.notifyMatchingSearches(property);
    }
    return notified;
  }

  private async notifySavedSearchOwner(
    savedSearch: SavedSearch,
    property: Property,
  ): Promise<void> {
    await this.notificationsService.notify(
      savedSearch.userId,
      'New listing matches your saved search',
      `"${property.title}" matches your saved search "${savedSearch.name}".`,
      'saved_search_match',
    );
    savedSearch.lastNotifiedAt = new Date();
    await this.savedSearchRepository.save(savedSearch);
  }
}
