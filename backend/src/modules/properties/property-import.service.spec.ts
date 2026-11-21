import { UserRole } from '../users/entities/user.entity';
import {
  BULK_IMPORT_CHUNK_SIZE,
  PropertyImportService,
} from './property-import.service';
import { CreatePropertyDto } from './dto/create-property.dto';

describe('PropertyImportService bulk inserts (#2183)', () => {
  const makeDto = (index: number): CreatePropertyDto =>
    ({
      title: `Property ${index}`,
      price: 1000 + index,
      images: [{ url: `https://example.com/${index}.jpg` }],
      amenities: [{ name: `amenity-${index}` }],
      rentalUnits: [{ unitNumber: `U-${index}`, price: 1000 + index }],
    }) as CreatePropertyDto;

  const setup = (transactionError?: Error) => {
    const inserts: Array<{ target: unknown; rows: unknown[] }> = [];
    const manager = {
      create: jest.fn((_target: unknown, value: object) => value),
      insert: jest.fn(async (target: unknown, rows: unknown[]) => {
        inserts.push({ target, rows });
        return { identifiers: [], generatedMaps: [], raw: [] };
      }),
    };
    const dataSource = {
      transaction: jest.fn(async (work: (tx: typeof manager) => unknown) => {
        if (transactionError) {
          throw transactionError;
        }
        return work(manager);
      }),
    };
    const cacheService = {
      invalidatePropertyDomainCaches: jest.fn().mockResolvedValue(undefined),
    };
    const service = new PropertyImportService(
      dataSource as never,
      cacheService as never,
    );
    return { service, dataSource, manager, inserts, cacheService };
  };

  it('imports in chunks of 50 with one transaction per chunk', async () => {
    const { service, dataSource, inserts } = setup();
    const dtos = Array.from({ length: 120 }, (_, i) => makeDto(i));

    const result = await service.bulkCreate(dtos, 'owner-1');

    expect(BULK_IMPORT_CHUNK_SIZE).toBe(50);
    expect(dataSource.transaction).toHaveBeenCalledTimes(3);
    expect(result).toHaveLength(120);
    // One array insert per table per chunk instead of one insert per row.
    expect(inserts).toHaveLength(12);
    for (const { rows } of inserts) {
      expect(rows.length).toBeLessThanOrEqual(BULK_IMPORT_CHUNK_SIZE);
    }
  });

  it('links child rows to their property and keeps drafts non-verified', async () => {
    const { service, inserts } = setup();
    const dtos = [
      {
        ...makeDto(1),
        verificationStatus: 'VERIFIED',
      } as CreatePropertyDto,
    ];

    await service.bulkCreate(dtos, 'owner-1', {
      id: 'agent-1',
      role: UserRole.AGENT,
    } as never);

    const properties = inserts.find(
      (entry) => entry.rows[0] && 'title' in (entry.rows[0] as object),
    );
    expect(properties?.rows[0]).toMatchObject({
      ownerId: 'owner-1',
      status: 'draft',
    });
    expect(
      (properties?.rows[0] as { verificationStatus?: string })
        .verificationStatus,
    ).toBeUndefined();

    const childInserts = inserts.filter(
      (entry) => entry.rows[0] && 'propertyId' in (entry.rows[0] as object),
    );
    expect(childInserts).toHaveLength(3);
    for (const entry of childInserts) {
      expect(entry.rows[0]).toMatchObject({
        propertyId: (properties?.rows[0] as { id: string }).id,
      });
    }
  });

  it('rolls back the chunk and does not cache when a transaction fails', async () => {
    const { service, cacheService } = setup(new Error('insert failed'));

    await expect(service.bulkCreate([makeDto(1)], 'owner-1')).rejects.toThrow(
      'insert failed',
    );
    expect(cacheService.invalidatePropertyDomainCaches).not.toHaveBeenCalled();
  });

  it('handles an empty import without touching the database', async () => {
    const { service, dataSource, cacheService } = setup();

    await expect(service.bulkCreate([], 'owner-1')).resolves.toEqual([]);
    expect(dataSource.transaction).not.toHaveBeenCalled();
    expect(cacheService.invalidatePropertyDomainCaches).not.toHaveBeenCalled();
  });
});
