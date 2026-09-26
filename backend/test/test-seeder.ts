import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import {
  User,
  UserRole,
  AuthMethod,
} from '../src/modules/users/entities/user.entity';
import {
  Property,
  PropertyType,
  ListingStatus,
  PropertyRentalMode,
} from '../src/modules/properties/entities/property.entity';
import { PropertyImage } from '../src/modules/properties/entities/property-image.entity';
import {
  RentAgreement,
  AgreementStatus,
} from '../src/modules/rent/entities/rent-contract.entity';
import { SupportedCurrency } from '../src/modules/transactions/entities/supported-currency.entity';

const SALT_ROUNDS = 10;
const TEST_PASSWORD = 'TestPassword@123';

export class TestSeeder {
  constructor(private dataSource: DataSource) {}

  async seedAll() {
    await this.seedCurrencies();
    const users = await this.seedUsers();
    const properties = await this.seedProperties(users.admins[0]);
    await this.seedAgreements(users.admins[0], users.tenants[0], properties[0]);
  }

  async seedCurrencies() {
    const repo = this.dataSource.getRepository(SupportedCurrency);
    const currencies = [
      { code: 'USD', name: 'US Dollar', isActive: true },
      { code: 'EUR', name: 'Euro', isActive: true },
      { code: 'NGN', name: 'Nigerian Naira', isActive: true },
    ];

    for (const c of currencies) {
      const existing = await repo.findOne({ where: { code: c.code } });
      if (!existing) {
        await repo.save(repo.create(c));
      }
    }
  }

  async seedUsers() {
    const repo = this.dataSource.getRepository(User);
    const passwordHash = await bcrypt.hash(TEST_PASSWORD, SALT_ROUNDS);

    const admin = await repo.save(
      repo.create({
        email: 'test.admin@chioma.local',
        firstName: 'Test',
        lastName: 'Admin',
        password: passwordHash,
        role: UserRole.ADMIN,
        emailVerified: true,
        isActive: true,
        authMethod: AuthMethod.PASSWORD,
      }),
    );

    const tenant = await repo.save(
      repo.create({
        email: 'test.tenant@chioma.local',
        firstName: 'Test',
        lastName: 'Tenant',
        password: passwordHash,
        role: UserRole.USER,
        emailVerified: true,
        isActive: true,
        authMethod: AuthMethod.PASSWORD,
      }),
    );

    return { admins: [admin], tenants: [tenant] };
  }

  async seedProperties(owner: User) {
    const repo = this.dataSource.getRepository(Property);
    const imageRepo = this.dataSource.getRepository(PropertyImage);

    const property = await repo.save(
      repo.create({
        title: 'Test Integration Property',
        description: 'A property for integration testing',
        type: PropertyType.APARTMENT,
        status: ListingStatus.PUBLISHED,
        address: '123 Test St',
        city: 'Test City',
        state: 'Test State',
        country: 'Test Country',
        price: 1000,
        currency: 'USD',
        bedrooms: 2,
        bathrooms: 1,
        area: 80,
        ownerId: owner.id,
        rentalMode: PropertyRentalMode.LONG_TERM,
      }),
    );

    await imageRepo.save(
      imageRepo.create({
        url: 'https://example.com/test-image.jpg',
        isPrimary: true,
        propertyId: property.id,
      }),
    );

    return [property];
  }

  async seedAgreements(admin: User, tenant: User, property: Property) {
    const repo = this.dataSource.getRepository(RentAgreement);

    await repo.save(
      repo.create({
        agreementNumber: 'AGR-TEST-0001',
        status: AgreementStatus.ACTIVE,
        propertyId: property.id,
        userId: tenant.id,
        adminId: admin.id,
        monthlyRent: 1000,
      }),
    );
  }
}
