import * as bcrypt from 'bcryptjs';
import { DataSource } from 'typeorm';
import {
  AuthMethod,
  User,
  UserRole,
} from '../../modules/users/entities/user.entity';
import {
  ListingStatus,
  Property,
  PropertyRentalMode,
  PropertyType,
} from '../../modules/properties/entities/property.entity';
import { PropertyImage } from '../../modules/properties/entities/property-image.entity';
import {
  AgreementStatus,
  RentAgreement,
} from '../../modules/rent/entities/rent-contract.entity';
import {
  Payment,
  PaymentStatus,
} from '../../modules/payments/entities/payment.entity';
import { GuestReview } from '../../modules/reviews/entities/guest-review.entity';
import { HostReview } from '../../modules/reviews/entities/host-review.entity';
import {
  Dispute,
  DisputeStatus,
  DisputeType,
} from '../../modules/disputes/entities/dispute.entity';
import {
  MaintenanceRequest,
  MaintenanceStatus,
} from '../../modules/maintenance/maintenance-request.entity';
import { Document as LeaseDocument } from '../../modules/documents/document.entity';
import { Notification } from '../../modules/notifications/entities/notification.entity';
import {
  PropertyInquiry,
  PropertyInquiryStatus,
} from '../../modules/inquiries/entities/property-inquiry.entity';
import { createScriptLogger } from '../../common/services/script-logger';

const logger = createScriptLogger('seed-comprehensive');

// Bcrypt cost 10: fast enough for dev seeds, secure enough for testing
const SALT_ROUNDS = 10;
const SEED_PASSWORD = 'Seed@123456';

// ─── Admin / User fixtures ──────────────────────────────────────────────────

const ADMIN_FIXTURES = [
  {
    email: 'admin.alice@chioma.local',
    firstName: 'Alice',
    lastName: 'Okafor',
  },
  {
    email: 'admin.bob@chioma.local',
    firstName: 'Bob',
    lastName: 'Mensah',
  },
  {
    email: 'admin.carol@chioma.local',
    firstName: 'Carol',
    lastName: 'Nwosu',
  },
  {
    email: 'admin.david@chioma.local',
    firstName: 'David',
    lastName: 'Eze',
  },
  {
    email: 'admin.eve@chioma.local',
    firstName: 'Eve',
    lastName: 'Adeyemi',
  },
];

const USER_FIXTURES = [
  { email: 'user.frank@chioma.local', firstName: 'Frank', lastName: 'Bello' },
  { email: 'user.grace@chioma.local', firstName: 'Grace', lastName: 'Dike' },
  { email: 'user.henry@chioma.local', firstName: 'Henry', lastName: 'Olawale' },
  { email: 'user.iris@chioma.local', firstName: 'Iris', lastName: 'Chukwu' },
  { email: 'user.james@chioma.local', firstName: 'James', lastName: 'Abiodun' },
];

// ─── Property fixtures (20 properties with Unsplash images) ─────────────────

interface PropertyFixture {
  title: string;
  description: string;
  type: PropertyType;
  address: string;
  city: string;
  state: string;
  country: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  area: number;
  imageUrls: string[];
}

const PROPERTY_FIXTURES: PropertyFixture[] = [
  {
    title: 'Modern Apartment in Lagos Island',
    description:
      'Spacious 3-bedroom apartment with ocean views and 24/7 security.',
    type: PropertyType.APARTMENT,
    address: '14 Ozumba Mbadiwe Ave',
    city: 'Lagos',
    state: 'Lagos',
    country: 'Nigeria',
    price: 350000,
    bedrooms: 3,
    bathrooms: 2,
    area: 120,
    imageUrls: [
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200',
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200',
    ],
  },
  {
    title: 'Executive Duplex in Victoria Island',
    description: 'Luxurious 4-bedroom duplex in a gated estate with pool.',
    type: PropertyType.HOUSE,
    address: '8 Ligali Ayorinde St',
    city: 'Lagos',
    state: 'Lagos',
    country: 'Nigeria',
    price: 600000,
    bedrooms: 4,
    bathrooms: 3,
    area: 220,
    imageUrls: [
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200',
    ],
  },
  {
    title: 'Studio Flat in Yaba',
    description:
      'Compact studio with high-speed internet, ideal for young professionals.',
    type: PropertyType.APARTMENT,
    address: '22 Herbert Macaulay Way',
    city: 'Lagos',
    state: 'Lagos',
    country: 'Nigeria',
    price: 95000,
    bedrooms: 1,
    bathrooms: 1,
    area: 45,
    imageUrls: [
      'https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=1200',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200',
    ],
  },
  {
    title: 'Smart Home in Lekki Phase 1',
    description:
      '3-bedroom smart home with automated lighting and climate control.',
    type: PropertyType.HOUSE,
    address: '5 Admiralty Way',
    city: 'Lekki',
    state: 'Lagos',
    country: 'Nigeria',
    price: 480000,
    bedrooms: 3,
    bathrooms: 3,
    area: 180,
    imageUrls: [
      'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200',
      'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=1200',
    ],
  },
  {
    title: 'Office Space in Ikoyi',
    description: 'Premium commercial space suitable for a 20-person team.',
    type: PropertyType.COMMERCIAL,
    address: '3 Alfred Rewane Rd',
    city: 'Lagos',
    state: 'Lagos',
    country: 'Nigeria',
    price: 900000,
    bedrooms: 0,
    bathrooms: 2,
    area: 300,
    imageUrls: [
      'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200',
      'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=1200',
    ],
  },
  {
    title: 'Terraced House in Abuja Gwarinpa',
    description: 'Well-maintained 3-bedroom terraced house with garden.',
    type: PropertyType.HOUSE,
    address: '12 1st Avenue',
    city: 'Abuja',
    state: 'FCT',
    country: 'Nigeria',
    price: 280000,
    bedrooms: 3,
    bathrooms: 2,
    area: 145,
    imageUrls: [
      'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1200',
      'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=1200',
    ],
  },
  {
    title: 'Penthouse in Maitama',
    description: 'Top-floor penthouse with panoramic views of Abuja city.',
    type: PropertyType.APARTMENT,
    address: '4 Usuma St',
    city: 'Abuja',
    state: 'FCT',
    country: 'Nigeria',
    price: 750000,
    bedrooms: 4,
    bathrooms: 4,
    area: 260,
    imageUrls: [
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200',
      'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1200',
    ],
  },
  {
    title: 'Beachfront Villa in Port Harcourt',
    description: 'Stunning beachfront property with direct beach access.',
    type: PropertyType.HOUSE,
    address: '9 Trans Amadi Industrial Layout',
    city: 'Port Harcourt',
    state: 'Rivers',
    country: 'Nigeria',
    price: 520000,
    bedrooms: 5,
    bathrooms: 4,
    area: 310,
    imageUrls: [
      'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1200',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200',
    ],
  },
  {
    title: 'Budget Apartment in Enugu GRA',
    description:
      'Affordable 2-bedroom flat in a quiet government residential area.',
    type: PropertyType.APARTMENT,
    address: '18 Abakaliki Rd',
    city: 'Enugu',
    state: 'Enugu',
    country: 'Nigeria',
    price: 120000,
    bedrooms: 2,
    bathrooms: 1,
    area: 75,
    imageUrls: [
      'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1200',
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=1200',
    ],
  },
  {
    title: 'Co-working Hub in Ibadan',
    description:
      'Open-plan commercial space with meeting rooms and fast fibre.',
    type: PropertyType.COMMERCIAL,
    address: '7 Ring Road',
    city: 'Ibadan',
    state: 'Oyo',
    country: 'Nigeria',
    price: 200000,
    bedrooms: 0,
    bathrooms: 3,
    area: 180,
    imageUrls: [
      'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=1200',
      'https://images.unsplash.com/photo-1527192491265-7e15c55b1ed2?w=1200',
    ],
  },
  {
    title: 'Family Bungalow in Kano',
    description: 'Spacious bungalow with large compound and borehole water.',
    type: PropertyType.HOUSE,
    address: '3 Gwagwarwa Road',
    city: 'Kano',
    state: 'Kano',
    country: 'Nigeria',
    price: 180000,
    bedrooms: 4,
    bathrooms: 2,
    area: 200,
    imageUrls: [
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200',
      'https://images.unsplash.com/photo-1449844908441-8829872d2607?w=1200',
    ],
  },
  {
    title: 'Luxury Flat in Oniru Estate',
    description: 'High-spec 2-bedroom flat with gym and concierge service.',
    type: PropertyType.APARTMENT,
    address: '1 Oniru Estate',
    city: 'Lagos',
    state: 'Lagos',
    country: 'Nigeria',
    price: 420000,
    bedrooms: 2,
    bathrooms: 2,
    area: 110,
    imageUrls: [
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200',
      'https://images.unsplash.com/photo-1560185893-a55cbc8c57e8?w=1200',
    ],
  },
  {
    title: 'Industrial Warehouse in Apapa',
    description:
      'Large warehouse suitable for logistics and storage operations.',
    type: PropertyType.COMMERCIAL,
    address: '15 Creek Road',
    city: 'Lagos',
    state: 'Lagos',
    country: 'Nigeria',
    price: 1200000,
    bedrooms: 0,
    bathrooms: 2,
    area: 800,
    imageUrls: [
      'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1200',
      'https://images.unsplash.com/photo-1587293852726-70cdb56c2866?w=1200',
    ],
  },
  {
    title: 'Serviced Apartment in Banana Island',
    description:
      'Fully-serviced 3-bedroom apartment with hotel-grade amenities.',
    type: PropertyType.APARTMENT,
    address: '2 Bourdillon Court',
    city: 'Lagos',
    state: 'Lagos',
    country: 'Nigeria',
    price: 850000,
    bedrooms: 3,
    bathrooms: 3,
    area: 160,
    imageUrls: [
      'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=1200',
      'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=1200',
    ],
  },
  {
    title: 'Starter Flat in Surulere',
    description:
      'Neat 1-bedroom flat close to National Stadium, great transport links.',
    type: PropertyType.APARTMENT,
    address: '6 Bode Thomas St',
    city: 'Lagos',
    state: 'Lagos',
    country: 'Nigeria',
    price: 85000,
    bedrooms: 1,
    bathrooms: 1,
    area: 55,
    imageUrls: [
      'https://images.unsplash.com/photo-1555636222-cae831e670b3?w=1200',
      'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1200',
    ],
  },
  {
    title: 'Garden Cottage in Asokoro',
    description:
      'Charming 2-bedroom cottage with mature garden in a quiet neighbourhood.',
    type: PropertyType.HOUSE,
    address: '11 Tafawa Balewa Way',
    city: 'Abuja',
    state: 'FCT',
    country: 'Nigeria',
    price: 320000,
    bedrooms: 2,
    bathrooms: 2,
    area: 130,
    imageUrls: [
      'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=1200',
      'https://images.unsplash.com/photo-1416331108676-a22ccb276e35?w=1200',
    ],
  },
  {
    title: 'Town House in Ikeja GRA',
    description: 'Executive 4-bedroom townhouse in the heart of Ikeja GRA.',
    type: PropertyType.HOUSE,
    address: '27 Mobolaji Bank Anthony Way',
    city: 'Lagos',
    state: 'Lagos',
    country: 'Nigeria',
    price: 550000,
    bedrooms: 4,
    bathrooms: 3,
    area: 240,
    imageUrls: [
      'https://images.unsplash.com/photo-1572120360610-d971b9d7767c?w=1200',
      'https://images.unsplash.com/photo-1575517111839-3a3843ee7f5d?w=1200',
    ],
  },
  {
    title: 'Studio in Maryland Mall',
    description: 'Modern studio apartment minutes from Maryland Mall.',
    type: PropertyType.APARTMENT,
    address: '33 Ikorodu Road',
    city: 'Lagos',
    state: 'Lagos',
    country: 'Nigeria',
    price: 110000,
    bedrooms: 1,
    bathrooms: 1,
    area: 48,
    imageUrls: [
      'https://images.unsplash.com/photo-1507089947368-19c1da9775ae?w=1200',
      'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=1200',
    ],
  },
  {
    title: 'Detached House in Owerri',
    description: 'Well-appointed 5-bedroom detached house with boys quarters.',
    type: PropertyType.HOUSE,
    address: '4 Port Harcourt Road',
    city: 'Owerri',
    state: 'Imo',
    country: 'Nigeria',
    price: 270000,
    bedrooms: 5,
    bathrooms: 3,
    area: 280,
    imageUrls: [
      'https://images.unsplash.com/photo-1480074568708-e7b720bb3f09?w=1200',
      'https://images.unsplash.com/photo-1499955085172-a104c9463ece?w=1200',
    ],
  },
  {
    title: 'Riverside Apartment in Calabar',
    description: 'Elegant 2-bedroom apartment with views of the Cross River.',
    type: PropertyType.APARTMENT,
    address: '10 Ndidem Usang Iso Road',
    city: 'Calabar',
    state: 'Cross River',
    country: 'Nigeria',
    price: 155000,
    bedrooms: 2,
    bathrooms: 2,
    area: 90,
    imageUrls: [
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200',
      'https://images.unsplash.com/photo-1560185127-6ed189bf02f4?w=1200',
    ],
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function upsertUser(
  repo: ReturnType<DataSource['getRepository']>,
  fixture: { email: string; firstName: string; lastName: string },
  role: UserRole,
  passwordHash: string,
): Promise<User> {
  const existing = await repo.findOne({
    where: { email: fixture.email },
  });
  if (existing) {
    return existing as User;
  }
  const user = repo.create({
    email: fixture.email,
    firstName: fixture.firstName,
    lastName: fixture.lastName,
    password: passwordHash,
    role,
    emailVerified: true,
    isActive: true,
    authMethod: AuthMethod.PASSWORD,
    failedLoginAttempts: 0,
    verificationToken: null,
    resetToken: null,
    resetTokenExpires: null,
    accountLockedUntil: null,
    refreshToken: null,
  });
  return repo.save(user) as Promise<User>;
}

// ─── Main export ─────────────────────────────────────────────────────────────

export async function seedComprehensiveData(
  dataSource: DataSource,
): Promise<void> {
  const userRepo = dataSource.getRepository(User);
  const propertyRepo = dataSource.getRepository(Property);
  const imageRepo = dataSource.getRepository(PropertyImage);
  const agreementRepo = dataSource.getRepository(RentAgreement);
  const paymentRepo = dataSource.getRepository(Payment);
  const guestReviewRepo = dataSource.getRepository(GuestReview);
  const hostReviewRepo = dataSource.getRepository(HostReview);
  const disputeRepo = dataSource.getRepository(Dispute);
  const maintenanceRepo = dataSource.getRepository(MaintenanceRequest);
  const documentRepo = dataSource.getRepository(LeaseDocument);
  const notificationRepo = dataSource.getRepository(Notification);
  const inquiryRepo = dataSource.getRepository(PropertyInquiry);

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, SALT_ROUNDS);

  // 1. Seed 5 admin users
  logger.log('Seeding admin users...');
  const admins: User[] = [];
  for (const fixture of ADMIN_FIXTURES) {
    const admin = await upsertUser(
      userRepo,
      fixture,
      UserRole.ADMIN,
      passwordHash,
    );
    admins.push(admin);
  }
  logger.log(`Admin users ready: ${admins.length}`);

  // 2. Seed 5 regular users (tenants)
  logger.log('Seeding regular users...');
  const users: User[] = [];
  for (const fixture of USER_FIXTURES) {
    const user = await upsertUser(
      userRepo,
      fixture,
      UserRole.USER,
      passwordHash,
    );
    users.push(user);
  }
  logger.log(`Regular users ready: ${users.length}`);

  // 3. Seed 20 properties
  logger.log('Seeding properties...');
  const properties: Property[] = [];
  for (let i = 0; i < PROPERTY_FIXTURES.length; i++) {
    const fixture = PROPERTY_FIXTURES[i];
    const owner = admins[i % admins.length];

    const existing = await propertyRepo.findOne({
      where: { title: fixture.title },
    });
    if (existing) {
      properties.push(existing);
      continue;
    }

    const property = propertyRepo.create({
      title: fixture.title,
      description: fixture.description,
      type: fixture.type,
      status: ListingStatus.PUBLISHED,
      address: fixture.address,
      city: fixture.city,
      state: fixture.state,
      postalCode: '100001',
      country: fixture.country,
      price: fixture.price,
      currency: 'USD',
      bedrooms: fixture.bedrooms,
      bathrooms: fixture.bathrooms,
      area: fixture.area,
      ownerId: owner.id,
      rentalMode: PropertyRentalMode.LONG_TERM,
    });

    const savedProperty = await propertyRepo.save(property);

    for (let j = 0; j < fixture.imageUrls.length; j++) {
      const image = imageRepo.create({
        url: fixture.imageUrls[j],
        sortOrder: j,
        isPrimary: j === 0,
        propertyId: savedProperty.id,
      });
      await imageRepo.save(image);
    }

    properties.push(savedProperty);
  }
  logger.log(`Properties ready: ${properties.length}`);

  // 4. Seed agreements (5 ACTIVE, 5 DRAFT, 5 EXPIRED)
  logger.log('Seeding agreements...');
  const agreementScenarios: Array<{
    status: AgreementStatus;
    startOffset: number;
    endOffset: number;
  }> = [
    // ACTIVE: started 6 months ago, ends in 6 months
    ...Array.from({ length: 5 }, () => ({
      status: AgreementStatus.ACTIVE,
      startOffset: -180,
      endOffset: 180,
    })),
    // DRAFT: no dates
    ...Array.from({ length: 5 }, () => ({
      status: AgreementStatus.DRAFT,
      startOffset: 0,
      endOffset: 0,
    })),
    // EXPIRED: started 13 months ago, ended 1 month ago
    ...Array.from({ length: 5 }, () => ({
      status: AgreementStatus.EXPIRED,
      startOffset: -395,
      endOffset: -30,
    })),
  ];

  let agreementsCreated = 0;
  const agreements: RentAgreement[] = [];
  for (let i = 0; i < agreementScenarios.length; i++) {
    const scenario = agreementScenarios[i];
    const admin = admins[i % admins.length];
    const user = users[i % users.length];
    const property = properties[i % properties.length];
    const agreementNumber = `AGR-SEED-${String(i + 1).padStart(4, '0')}`;

    const existing = await agreementRepo.findOne({
      where: { agreementNumber },
    });
    if (existing) {
      agreements.push(existing);
      continue;
    }

    const now = new Date();
    const msPerDay = 86_400_000;
    const startDate =
      scenario.status !== AgreementStatus.DRAFT
        ? new Date(now.getTime() + scenario.startOffset * msPerDay)
        : null;
    const endDate =
      scenario.status !== AgreementStatus.DRAFT
        ? new Date(now.getTime() + scenario.endOffset * msPerDay)
        : null;

    const agreement = agreementRepo.create({
      agreementNumber,
      propertyId: property.id,
      adminId: admin.id,
      userId: user.id,
      status: scenario.status,
      monthlyRent: 150000 + (i % 5) * 25000,
      securityDeposit: 300000 + (i % 5) * 50000,
      startDate,
      endDate,
      renewalOption: scenario.status === AgreementStatus.ACTIVE,
    });

    const savedAgreement = await agreementRepo.save(agreement);
    agreements.push(savedAgreement);
    agreementsCreated++;
  }
  logger.log(
    `Agreements ready: ${agreementsCreated} created (skipped existing)`,
  );

  // 5. Seed payments (2 completed + 1 pending per non-draft agreement)
  logger.log('Seeding payments...');
  let paymentsCreated = 0;
  const nonDraftAgreements = agreements.filter(
    (a) => a.status !== AgreementStatus.DRAFT,
  );
  for (const agreement of nonDraftAgreements) {
    const scenarios: Array<{ offsetMonths: number; status: PaymentStatus }> = [
      { offsetMonths: -2, status: PaymentStatus.COMPLETED },
      { offsetMonths: -1, status: PaymentStatus.COMPLETED },
      {
        offsetMonths: 0,
        status:
          agreement.status === AgreementStatus.ACTIVE
            ? PaymentStatus.PENDING
            : PaymentStatus.COMPLETED,
      },
    ];

    for (let i = 0; i < scenarios.length; i++) {
      const idempotencyKey = `SEED-PAY-${agreement.agreementNumber}-${i + 1}`;
      const existing = await paymentRepo.findOne({
        where: { userId: agreement.userId, idempotencyKey },
      });
      if (existing) {
        continue;
      }

      const processedAt = new Date(
        Date.now() + scenarios[i].offsetMonths * 30 * 86_400_000,
      );
      const payment = paymentRepo.create({
        userId: agreement.userId,
        agreementId: agreement.id,
        amount: agreement.monthlyRent,
        transactionFee: Number(agreement.monthlyRent) * 0.015,
        netAmount: Number(agreement.monthlyRent) * 0.985,
        currency: 'NGN',
        status: scenarios[i].status,
        paymentMethod: 'card',
        referenceNumber: `REF-${idempotencyKey}`,
        processedAt:
          scenarios[i].status === PaymentStatus.COMPLETED
            ? processedAt
            : undefined,
        idempotencyKey,
      });
      await paymentRepo.save(payment);
      paymentsCreated++;
    }
  }
  logger.log(`Payments ready: ${paymentsCreated} created (skipped existing)`);

  // 6. Seed reviews for expired agreements (lease completed) — guest <-> host
  logger.log('Seeding reviews...');
  let reviewsCreated = 0;
  const expiredAgreements = agreements.filter(
    (a) => a.status === AgreementStatus.EXPIRED,
  );
  const reviewComments = [
    'Great experience, would rent again.',
    'Communication was smooth throughout the lease.',
    'Property was well maintained, minor issues resolved quickly.',
    'Solid experience overall, a few rough edges.',
    'Everything went as expected, no complaints.',
  ];
  for (let i = 0; i < expiredAgreements.length; i++) {
    const agreement = expiredAgreements[i];
    const bookingId = agreement.id;

    const existingGuestReview = await guestReviewRepo.findOne({
      where: { bookingId, hostId: agreement.adminId },
    });
    if (!existingGuestReview) {
      await guestReviewRepo.save(
        guestReviewRepo.create({
          bookingId,
          guestId: agreement.userId,
          hostId: agreement.adminId,
          cleanliness: 4 + (i % 2),
          communication: 4 + (i % 2),
          respectForRules: 5,
          comment: reviewComments[i % reviewComments.length],
          wouldHostAgain: true,
        }),
      );
      reviewsCreated++;
    }

    const existingHostReview = await hostReviewRepo.findOne({
      where: { bookingId, guestId: agreement.userId },
    });

    if (!existingHostReview) {
      await hostReviewRepo.save(
        hostReviewRepo.create({
          bookingId,
          guestId: agreement.userId,
          hostId: agreement.adminId,
          accuracy: 4 + (i % 2),
          cleanliness: 5,
          checkIn: 5,
          communication: 4 + (i % 2),
          location: 5,
          value: 4,
          comment: reviewComments[(i + 1) % reviewComments.length],
        }),
      );
      reviewsCreated++;
    }
  }
  logger.log(`Reviews ready: ${reviewsCreated} created (skipped existing)`);

  // 7. Seed disputes (tied to real agreement FK)
  logger.log('Seeding disputes...');
  const disputeScenarios: Array<{
    type: DisputeType;
    status: DisputeStatus;
    description: string;
    requestedAmount: number | undefined;
    resolved: boolean;
  }> = [
    {
      type: DisputeType.SECURITY_DEPOSIT,
      status: DisputeStatus.RESOLVED,
      description: 'Tenant disputes deductions made from security deposit.',
      requestedAmount: 50000,
      resolved: true,
    },
    {
      type: DisputeType.MAINTENANCE,
      status: DisputeStatus.UNDER_REVIEW,
      description: 'Landlord delayed repair of a reported plumbing issue.',
      requestedAmount: undefined,
      resolved: false,
    },
    {
      type: DisputeType.RENT_PAYMENT,
      status: DisputeStatus.OPEN,
      description: 'Discrepancy between paid amount and recorded rent.',
      requestedAmount: 25000,
      resolved: false,
    },
    {
      type: DisputeType.PROPERTY_DAMAGE,
      status: DisputeStatus.REJECTED,
      description: 'Claim of pre-existing damage not caused by tenant.',
      requestedAmount: 80000,
      resolved: true,
    },
  ];

  let disputesCreated = 0;
  for (let i = 0; i < disputeScenarios.length; i++) {
    const scenario = disputeScenarios[i];
    const agreement =
      expiredAgreements[i % Math.max(expiredAgreements.length, 1)] ??
      agreements[i % agreements.length];
    const disputeId = `DISPUTE-SEED-${String(i + 1).padStart(4, '0')}`;

    const existing = await disputeRepo.findOne({ where: { disputeId } });
    if (existing) {
      continue;
    }

    await disputeRepo.save(
      disputeRepo.create({
        disputeId,
        agreementId: agreement.id,
        initiatedBy: agreement.userId,
        disputeType: scenario.type,
        requestedAmount: scenario.requestedAmount,
        description: scenario.description,
        status: scenario.status,
        resolution: scenario.resolved
          ? 'Reviewed by admin and resolved per platform policy.'
          : undefined,
        resolvedBy: scenario.resolved ? agreement.adminId : undefined,
        resolvedAt: scenario.resolved ? new Date() : undefined,
      }),
    );
    disputesCreated++;
  }
  logger.log(`Disputes ready: ${disputesCreated} created (skipped existing)`);

  // 8. Seed maintenance requests
  logger.log('Seeding maintenance requests...');
  const maintenanceScenarios: Array<{
    category: string;
    description: string;
    priority: string;
    status: MaintenanceStatus;
  }> = [
    {
      category: 'Plumbing',
      description: 'Leaking pipe under the kitchen sink.',
      priority: 'HIGH',
      status: MaintenanceStatus.RESOLVED,
    },
    {
      category: 'Electrical',
      description: 'Intermittent power loss in the living room.',
      priority: 'HIGH',
      status: MaintenanceStatus.IN_PROGRESS,
    },
    {
      category: 'HVAC',
      description: 'Air conditioning unit not cooling properly.',
      priority: 'MEDIUM',
      status: MaintenanceStatus.OPEN,
    },
    {
      category: 'General Repair',
      description: 'Broken cabinet hinge in the bathroom.',
      priority: 'LOW',
      status: MaintenanceStatus.CLOSED,
    },
    {
      category: 'Pest Control',
      description: 'Ants spotted near the balcony door.',
      priority: 'MEDIUM',
      status: MaintenanceStatus.OPEN,
    },
  ];

  let maintenanceCreated = 0;
  for (let i = 0; i < maintenanceScenarios.length; i++) {
    const scenario = maintenanceScenarios[i];
    const agreement = nonDraftAgreements[i % nonDraftAgreements.length];

    const existing = await maintenanceRepo.findOne({
      where: {
        propertyId: agreement.propertyId,
        tenantId: agreement.userId,
        category: scenario.category,
      },
    });
    if (existing) {
      continue;
    }

    await maintenanceRepo.save(
      maintenanceRepo.create({
        propertyId: agreement.propertyId,
        tenantId: agreement.userId,
        landlordId: agreement.adminId,
        category: scenario.category,
        description: scenario.description,
        priority: scenario.priority,
        status: scenario.status,
      }),
    );
    maintenanceCreated++;
  }
  logger.log(
    `Maintenance requests ready: ${maintenanceCreated} created (skipped existing)`,
  );

  // 9. Seed lease documents for non-draft agreements
  logger.log('Seeding documents...');
  let documentsCreated = 0;
  for (const agreement of nonDraftAgreements) {
    const name = `Lease Agreement - ${agreement.agreementNumber}`;
    const existing = await documentRepo.findOne({ where: { name } });
    if (existing) {
      continue;
    }

    await documentRepo.save(
      documentRepo.create({
        name,
        type: 'LEASE',
        status:
          agreement.status === AgreementStatus.EXPIRED ? 'ARCHIVED' : 'ACTIVE',
        category: 'lease',
        fileKey: `seed/leases/${agreement.agreementNumber}.pdf`,
        fileSize: 245_760,
        fileType: 'application/pdf',
        propertyId: agreement.propertyId,
        tenantId: agreement.userId,
        ownerId: agreement.adminId,
        description: `Signed lease document for ${agreement.agreementNumber}.`,
        sharedWith: [agreement.userId, agreement.adminId],
      }),
    );
    documentsCreated++;
  }
  logger.log(`Documents ready: ${documentsCreated} created (skipped existing)`);

  // 10. Seed notifications for tenants
  logger.log('Seeding notifications...');
  const notificationTemplates = [
    {
      title: 'Payment due soon',
      message: 'Your next rent payment is due in 5 days.',
      type: 'payment_reminder',
    },
    {
      title: 'Maintenance update',
      message: 'Your maintenance request status has changed.',
      type: 'maintenance_update',
    },
    {
      title: 'Lease renewal available',
      message: 'Your lease is eligible for renewal — review your options.',
      type: 'lease_renewal',
    },
  ];

  let notificationsCreated = 0;
  for (const user of users) {
    for (const template of notificationTemplates) {
      const existing = await notificationRepo.findOne({
        where: { userId: user.id, title: template.title },
      });
      if (existing) {
        continue;
      }
      await notificationRepo.save(
        notificationRepo.create({
          userId: user.id,
          title: template.title,
          message: template.message,
          type: template.type,
          isRead: false,
        }),
      );
      notificationsCreated++;
    }
  }
  logger.log(
    `Notifications ready: ${notificationsCreated} created (skipped existing)`,
  );

  // 11. Seed property inquiries for published properties without an agreement
  logger.log('Seeding property inquiries...');
  const propertiesWithAgreements = new Set(agreements.map((a) => a.propertyId));
  const availableProperties = properties.filter(
    (p) => !propertiesWithAgreements.has(p.id),
  );
  const inquiryMessages = [
    'Is this property still available for viewing this weekend?',
    'Could you share more details on the utilities included?',
    'I am interested — what is the earliest move-in date?',
  ];

  let inquiriesCreated = 0;
  for (let i = 0; i < availableProperties.length && i < 10; i++) {
    const property = availableProperties[i];
    const fromUser = users[i % users.length];

    const existing = await inquiryRepo.findOne({
      where: {
        propertyId: property.id,
        fromUserId: fromUser.id,
        toUserId: property.ownerId,
      },
    });
    if (existing) {
      continue;
    }

    await inquiryRepo.save(
      inquiryRepo.create({
        propertyId: property.id,
        fromUserId: fromUser.id,
        toUserId: property.ownerId,
        message: inquiryMessages[i % inquiryMessages.length],
        senderName: `${fromUser.firstName} ${fromUser.lastName}`,
        senderEmail: fromUser.email,
        status: PropertyInquiryStatus.PENDING,
      }),
    );
    inquiriesCreated++;
  }
  logger.log(
    `Property inquiries ready: ${inquiriesCreated} created (skipped existing)`,
  );

  logger.log(
    `Comprehensive seed complete. Default password for all seed accounts: ${SEED_PASSWORD}`,
  );
}
