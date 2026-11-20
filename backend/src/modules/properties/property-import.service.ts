import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { randomUUID } from 'crypto';
import { ListingStatus, Property } from './entities/property.entity';
import { PropertyImage } from './entities/property-image.entity';
import { PropertyAmenity } from './entities/property-amenity.entity';
import { RentalUnit } from './entities/rental-unit.entity';
import { CreatePropertyDto } from './dto/create-property.dto';
import { User, UserRole } from '../users/entities/user.entity';
import { CacheService } from '../../common/cache/cache.service';

/** Chunk size required by #2183. */
export const BULK_IMPORT_CHUNK_SIZE = 50;

/**
 * Bulk property import. The single-property path in PropertiesService is
 * unchanged; this service exists only for the bulk endpoint. Each chunk is
 * persisted inside its own transaction with one array insert per table, so a
 * batch of N properties costs O(N/50) round trips rather than O(N).
 */
@Injectable()
export class PropertyImportService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly cacheService: CacheService,
  ) {}

  async bulkCreate(
    dtos: CreatePropertyDto[],
    ownerId: string,
    actingUser?: User,
  ): Promise<Property[]> {
    if (dtos.length === 0) {
      return [];
    }

    const saved: Property[] = [];
    for (
      let offset = 0;
      offset < dtos.length;
      offset += BULK_IMPORT_CHUNK_SIZE
    ) {
      const chunk = dtos.slice(offset, offset + BULK_IMPORT_CHUNK_SIZE);
      saved.push(
        ...(await this.dataSource.transaction((manager) =>
          this.persistChunk(manager, chunk, ownerId, actingUser),
        )),
      );
    }

    // Newly created properties have no cached detail entries. Clearing the
    // list/search caches once is enough and avoids one invalidation per row.
    await this.cacheService.invalidatePropertyDomainCaches();
    return saved;
  }

  /**
   * Shared persistence helper for one chunk. UUIDs are assigned here so all
   * four tables can be written with a single array `insert()` each and the
   * child rows can reference their parent without a round trip to read IDs.
   */
  private async persistChunk(
    manager: EntityManager,
    chunk: CreatePropertyDto[],
    ownerId: string,
    actingUser?: User,
  ): Promise<Property[]> {
    const properties = chunk.map((dto) => {
      const {
        images: _images,
        amenities: _amenities,
        rentalUnits: _rentalUnits,
        ...propertyData
      } = dto;
      if (!actingUser || actingUser.role !== UserRole.ADMIN) {
        delete (propertyData as { verificationStatus?: string })
          .verificationStatus;
      }
      return manager.create(Property, {
        ...propertyData,
        id: randomUUID(),
        ownerId,
        status: ListingStatus.DRAFT,
      });
    });

    await manager.insert(Property, properties);

    const images: Partial<PropertyImage>[] = [];
    const amenities: Partial<PropertyAmenity>[] = [];
    const rentalUnits: Partial<RentalUnit>[] = [];

    chunk.forEach((dto, index) => {
      const propertyId = properties[index].id;
      for (const image of dto.images ?? []) {
        images.push({ ...image, id: randomUUID(), propertyId });
      }
      for (const amenity of dto.amenities ?? []) {
        amenities.push({ ...amenity, id: randomUUID(), propertyId });
      }
      for (const unit of dto.rentalUnits ?? []) {
        rentalUnits.push({ ...unit, id: randomUUID(), propertyId });
      }
    });

    if (images.length > 0) {
      await manager.insert(PropertyImage, images);
    }
    if (amenities.length > 0) {
      await manager.insert(PropertyAmenity, amenities);
    }
    if (rentalUnits.length > 0) {
      await manager.insert(RentalUnit, rentalUnits);
    }

    return properties;
  }
}
