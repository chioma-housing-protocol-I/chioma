import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { PropertyImage } from './property-image.entity';
import { PropertyAmenity } from './property-amenity.entity';
import { RentalUnit } from './rental-unit.entity';

export enum PropertyType {
  APARTMENT = 'apartment',
  HOUSE = 'house',
  COMMERCIAL = 'commercial',
  LAND = 'land',
  OTHER = 'other',
}

export enum ListingStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  RENTED = 'rented',
  ARCHIVED = 'archived',
}

export enum PropertyRentalMode {
  LONG_TERM = 'long_term',
  SHORT_TERM = 'short_term',
  HYBRID = 'hybrid',
  FLEXIBLE = 'flexible',
}

export enum CancellationPolicy {
  FLEXIBLE = 'flexible',
  MODERATE = 'moderate',
  STRICT = 'strict',
}

@Entity('properties')
export class Property {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: PropertyType, default: PropertyType.APARTMENT })
  type: PropertyType;

  @Column({ type: 'enum', enum: ListingStatus, default: ListingStatus.DRAFT })
  status: ListingStatus;

  // Location
  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude: number;

  @Column({ type: 'varchar', nullable: true })
  address: string;

  @Column({ type: 'varchar', nullable: true })
  city: string;

  @Column({ type: 'varchar', nullable: true })
  state: string;

  @Column({ name: 'postal_code', type: 'varchar', nullable: true })
  postalCode: string;

  @Column({ type: 'varchar', nullable: true })
  country: string;

  // Pricing
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  price: number;

  @Column({ type: 'varchar', default: 'USD' })
  currency: string;

  // Property details
  @Column({ type: 'int', nullable: true })
  bedrooms: number;

  @Column({ type: 'int', nullable: true })
  bathrooms: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  area: number;

  @Column({ type: 'int', nullable: true })
  floor: number;

  @Column({ name: 'is_furnished', type: 'boolean', default: false })
  isFurnished: boolean;

  @Column({ name: 'has_parking', type: 'boolean', default: false })
  hasParking: boolean;

  @Column({ name: 'pets_allowed', type: 'boolean', default: false })
  petsAllowed: boolean;

  // Metadata
  @Column({
    type: process.env.DB_TYPE === 'sqlite' ? 'text' : 'jsonb',
    nullable: true,
  })
  metadata: Record<string, any>;

  // Relations
  @Index()
  @Column({ name: 'owner_id', type: 'uuid' })
  ownerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_id' })
  owner: User;

  @OneToMany(() => PropertyImage, (image) => image.property, { cascade: true })
  images: PropertyImage[];

  @OneToMany(() => PropertyAmenity, (amenity) => amenity.property, {
    cascade: true,
  })
  amenities: PropertyAmenity[];

  @OneToMany(() => RentalUnit, (unit) => unit.property, { cascade: true })
  rentalUnits: RentalUnit[];

  // Rental mode
  @Column({
    name: 'rental_mode',
    type: 'enum',
    enum: PropertyRentalMode,
    default: PropertyRentalMode.LONG_TERM,
  })
  rentalMode: PropertyRentalMode;

  // Stay duration
  @Column({ name: 'min_stay_days', type: 'int', default: 1 })
  minStayDays: number;

  @Column({ name: 'max_stay_days', type: 'int', nullable: true })
  maxStayDays: number | null;

  // Short-term pricing
  @Column({
    name: 'nightly_rate',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  nightlyRate: number | null;

  @Column({
    name: 'weekly_discount',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
  })
  weeklyDiscount: number;

  @Column({
    name: 'monthly_discount',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
  })
  monthlyDiscount: number;

  @Column({
    name: 'cleaning_fee',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  cleaningFee: number;

  @Column({
    name: 'extra_guest_fee',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  extraGuestFee: number;

  @Column({ name: 'max_guests', type: 'int', default: 4 })
  maxGuests: number;

  // Booking settings
  @Column({ name: 'instant_booking', type: 'boolean', default: false })
  instantBooking: boolean;

  @Column({
    name: 'require_guest_verification',
    type: 'boolean',
    default: true,
  })
  requireGuestVerification: boolean;

  @Column({
    name: 'minimum_guest_rating',
    type: 'decimal',
    precision: 3,
    scale: 1,
    default: 0,
  })
  minimumGuestRating: number;

  @Column({
    name: 'cancellation_policy',
    type: 'enum',
    enum: CancellationPolicy,
    default: CancellationPolicy.MODERATE,
  })
  cancellationPolicy: CancellationPolicy;

  @Column({ name: 'check_in_time', type: 'varchar', default: '15:00' })
  checkInTime: string;

  @Column({ name: 'check_out_time', type: 'varchar', default: '11:00' })
  checkOutTime: string;

  @Column({ name: 'check_in_method', type: 'varchar', default: 'lockbox' })
  checkInMethod: string;

  // Subletting
  @Column({ name: 'subletting_allowed', type: 'boolean', default: false })
  sublettingAllowed: boolean;

  @Column({
    name: 'subletting_approval_required',
    type: 'boolean',
    default: true,
  })
  sublettingApprovalRequired: boolean;

  @Column({ name: 'subletting_max_days_per_year', type: 'int', default: 90 })
  sublettingMaxDaysPerYear: number;

  @Column({
    name: 'subletting_tenant_share',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 60,
  })
  sublettingTenantShare: number;

  @Column({
    name: 'subletting_landlord_share',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 30,
  })
  sublettingLandlordShare: number;

  // House rules
  @Column({ name: 'smoking_allowed', type: 'boolean', default: false })
  smokingAllowed: boolean;

  @Column({ name: 'parties_allowed', type: 'boolean', default: false })
  partiesAllowed: boolean;

  @Column({ name: 'children_allowed', type: 'boolean', default: true })
  childrenAllowed: boolean;

  // AI fields
  @Column({
    name: 'ai_pricing_suggestion',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  aiPricingSuggestion: number | null;

  @Column({
    name: 'ai_optimal_mode',
    type: 'enum',
    enum: PropertyRentalMode,
    nullable: true,
  })
  aiOptimalMode: PropertyRentalMode | null;

  @Column({
    name: 'ai_occupancy_prediction',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  aiOccupancyPrediction: number | null;

  // Timestamps
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
