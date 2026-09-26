import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { PropertyAvailability } from './entities/property-availability.entity';
import { Property } from './entities/property.entity';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';
import { BlockDatesDto } from './dto/block-dates.dto';
import { SetPriceDto } from './dto/set-price.dto';
import { SetPriceRangeDto } from './dto/set-price-range.dto';
import { ICalService } from './services/ical.service';

const MAX_RANGE_DAYS = 366;

@Injectable()
export class AvailabilityService {
  constructor(
    @InjectRepository(PropertyAvailability)
    private readonly availabilityRepo: Repository<PropertyAvailability>,
    @InjectRepository(Property)
    private readonly propertyRepo: Repository<Property>,
    private readonly icalService: ICalService,
  ) {}

  async getAvailability(
    propertyId: string,
    startDate: string,
    endDate: string,
  ): Promise<object[]> {
    if (startDate > endDate) {
      throw new BadRequestException(
        'startDate must be before or equal to endDate',
      );
    }

    const rows = await this.availabilityRepo.find({
      where: {
        propertyId,
        date: Between(startDate, endDate),
      },
      order: { date: 'ASC' },
    });

    return this.fillCalendar(startDate, endDate, rows);
  }

  async updateAvailability(
    propertyId: string,
    dto: UpdateAvailabilityDto,
    userId: string,
  ): Promise<{ success: boolean; updatedDates: number }> {
    await this.verifyOwnership(propertyId, userId);

    const dates = this.generateDateRange(dto.startDate, dto.endDate);
    const rows = dates.map((date) => ({
      propertyId,
      date,
      available: dto.available,
      customPrice: dto.customPrice,
      notes: dto.notes,
      blockedByBookingId: dto.blockedByBookingId,
    }));

    await this.availabilityRepo.upsert(rows, ['propertyId', 'date']);

    return {
      success: true,
      updatedDates: rows.length,
    };
  }

  async blockDates(
    propertyId: string,
    dto: BlockDatesDto,
    userId: string,
  ): Promise<void> {
    await this.verifyOwnership(propertyId, userId);

    for (const date of dto.dates) {
      await this.availabilityRepo.upsert(
        { propertyId, date, available: false },
        ['propertyId', 'date'],
      );
    }
  }

  async unblockDates(
    propertyId: string,
    dto: BlockDatesDto,
    userId: string,
  ): Promise<void> {
    await this.verifyOwnership(propertyId, userId);

    for (const date of dto.dates) {
      const existing = await this.availabilityRepo.findOne({
        where: { propertyId, date },
      });

      if (existing) {
        existing.available = true;
        await this.availabilityRepo.save(existing);
      } else {
        await this.availabilityRepo.upsert(
          { propertyId, date, available: true },
          ['propertyId', 'date'],
        );
      }
    }
  }

  async setPrice(
    propertyId: string,
    dto: SetPriceDto,
    userId: string,
  ): Promise<PropertyAvailability> {
    await this.verifyOwnership(propertyId, userId);

    await this.availabilityRepo.upsert(
      { propertyId, date: dto.date, customPrice: dto.price },
      ['propertyId', 'date'],
    );

    return this.availabilityRepo.findOneOrFail({
      where: { propertyId, date: dto.date },
    });
  }

  async setPriceRange(
    propertyId: string,
    dto: SetPriceRangeDto,
    userId: string,
  ): Promise<{ success: boolean; updatedDates: number; dates: string[] }> {
    if (dto.startDate > dto.endDate) {
      throw new BadRequestException(
        'startDate must be before or equal to endDate',
      );
    }
    await this.verifyOwnership(propertyId, userId);

    let dates = this.generateDateRange(dto.startDate, dto.endDate);
    if (dates.length > MAX_RANGE_DAYS) {
      throw new BadRequestException(
        `Date range cannot exceed ${MAX_RANGE_DAYS} days`,
      );
    }
    if (dto.daysOfWeek?.length) {
      const weekdays = new Set(dto.daysOfWeek);
      dates = dates.filter((date) =>
        weekdays.has(new Date(`${date}T00:00:00Z`).getUTCDay()),
      );
    }

    if (dates.length) {
      await this.availabilityRepo.upsert(
        dates.map((date) => ({ propertyId, date, customPrice: dto.price })),
        ['propertyId', 'date'],
      );
    }

    return { success: true, updatedDates: dates.length, dates };
  }

  async getICalFeed(propertyId: string, months = 12): Promise<string> {
    const property = await this.propertyRepo.findOne({
      where: { id: propertyId },
    });
    if (!property) {
      throw new NotFoundException(`Property ${propertyId} not found`);
    }

    const start = new Date();
    const end = new Date(start);
    end.setUTCMonth(end.getUTCMonth() + months);
    const startDate = start.toISOString().split('T')[0];
    const endDate = end.toISOString().split('T')[0];

    const rows = await this.availabilityRepo.find({
      where: { propertyId, date: Between(startDate, endDate) },
      order: { date: 'ASC' },
    });

    return this.icalService.buildFeed(
      propertyId,
      property.title ?? 'Property',
      rows.map((row) => ({ date: row.date, available: row.available })),
      start,
    );
  }

  private async verifyOwnership(
    propertyId: string,
    userId: string,
  ): Promise<void> {
    const property = await this.propertyRepo.findOne({
      where: { id: propertyId },
    });

    if (!property) {
      throw new NotFoundException(`Property ${propertyId} not found`);
    }

    if (property.ownerId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to modify this property availability',
      );
    }
  }

  private fillCalendar(
    startDate: string,
    endDate: string,
    rows: PropertyAvailability[],
  ): object[] {
    const rowMap = new Map(rows.map((r) => [r.date, r]));
    const calendar: object[] = [];

    const current = new Date(startDate + 'T00:00:00Z');
    const end = new Date(endDate + 'T00:00:00Z');

    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      const row = rowMap.get(dateStr);

      calendar.push({
        date: dateStr,
        available: row?.available ?? true,
        customPrice: row?.customPrice ?? null,
        notes: row?.notes ?? null,
        blockedByBookingId: row?.blockedByBookingId ?? null,
      });

      current.setUTCDate(current.getUTCDate() + 1);
    }

    return calendar;
  }

  private generateDateRange(startDate: string, endDate: string): string[] {
    const dates: string[] = [];
    const current = new Date(`${startDate}T00:00:00Z`);
    const end = new Date(`${endDate}T00:00:00Z`);

    while (current <= end) {
      dates.push(current.toISOString().split('T')[0]);
      current.setUTCDate(current.getUTCDate() + 1);
    }

    return dates;
  }
}
