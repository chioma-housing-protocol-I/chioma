# Backend Contributing Guide

This document provides comprehensive guidelines for contributing to the Chioma backend. It covers project architecture, development standards, testing requirements, and CI/CD pipeline expectations.

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture & Design](#architecture--design)
3. [Project Structure](#project-structure)
4. [Module Development](#module-development)
5. [Database & Migrations](#database--migrations)
6. [Testing Strategy](#testing-strategy)
7. [API Development](#api-development)
8. [PR Requirements & CI/CD Pipeline](#pr-requirements--cicd-pipeline)
9. [Development Workflow](#development-workflow)
10. [Best Practices](#best-practices)

---

## Project Overview

**Chioma Backend** is a NestJS-based REST API with blockchain integration, built for a property rental platform.

### Tech Stack

```
Framework: NestJS 11 (Node.js)
Language: TypeScript 5
Database: PostgreSQL 16
ORM: TypeORM
Authentication: JWT + Passport
Blockchain: Stellar SDK
Message Queue: Bull (Redis)
Caching: Redis
Testing: Jest
API Docs: Swagger/OpenAPI
```

### Key Features

- Multi-tenant property rental platform
- Blockchain-based escrow and payments (Stellar)
- JWT authentication with refresh tokens
- Role-based access control (RBAC)
- Database migrations with TypeORM
- Message queues for async tasks
- Comprehensive error handling
- API documentation with Swagger
- Security hardening (CSRF, rate limiting, encryption)

---

## Architecture & Design

### Layered Architecture

```
┌─────────────────────────────────────┐
│         HTTP Controllers            │  (Request/Response)
├─────────────────────────────────────┤
│         Services (Business Logic)   │  (Core logic)
├─────────────────────────────────────┤
│         Repositories (Data Access)  │  (Database queries)
├─────────────────────────────────────┤
│         Database (PostgreSQL)       │  (Persistence)
└─────────────────────────────────────┘
```

### Design Patterns

**Dependency Injection**

```typescript
// NestJS handles DI automatically
@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly emailService: EmailService,
  ) {}
}
```

**Repository Pattern**

```typescript
// Encapsulates database queries
@Injectable()
export class UserRepository {
  constructor(private readonly dataSource: DataSource) {}

  async findById(id: string): Promise<User> {
    return this.dataSource.getRepository(User).findOne({ where: { id } });
  }
}
```

**Service Layer**

```typescript
// Contains business logic
@Injectable()
export class UserService {
  async createUser(dto: CreateUserDto): Promise<User> {
    // Validation, business logic, etc.
    return this.userRepository.save(user);
  }
}
```

**Controller Layer**

```typescript
// Handles HTTP requests/responses
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  async create(@Body() dto: CreateUserDto) {
    return this.userService.createUser(dto);
  }
}
```

---

## Project Structure

```
backend/
├── src/
│   ├── main.ts                       # Application entry point
│   ├── app.module.ts                 # Root module
│   ├── app.controller.ts             # Root controller
│   ├── app.service.ts                # Root service
│   │
│   ├── common/                       # Shared utilities
│   │   ├── decorators/               # Custom decorators
│   │   ├── dto/                      # Common DTOs
│   │   ├── errors/                   # Error handling
│   │   ├── filters/                  # Exception filters
│   │   ├── interceptors/             # HTTP interceptors
│   │   ├── middleware/               # Express middleware
│   │   ├── pipes/                    # Validation pipes
│   │   ├── services/                 # Shared services
│   │   ├── utils/                    # Helper functions
│   │   └── logger/                   # Logging utilities
│   │
│   ├── database/                     # Database configuration
│   │   ├── data-source.ts            # TypeORM data source
│   │   ├── migration-runner.ts       # Safe migration runner
│   │   ├── seed-runner.ts            # Database seeding
│   │   ├── migrations/               # Migration files
│   │   └── seeds/                    # Seed data
│   │
│   ├── modules/                      # Feature modules
│   │   ├── auth/                     # Authentication
│   │   ├── users/                    # User management
│   │   ├── properties/               # Property listings
│   │   ├── agreements/               # Rental agreements
│   │   ├── payments/                 # Payment processing
│   │   ├── disputes/                 # Dispute resolution
│   │   ├── stellar/                  # Blockchain integration
│   │   ├── notifications/            # Notifications
│   │   ├── messaging/                # Messaging system
│   │   ├── kyc/                      # KYC verification
│   │   ├── webhooks/                 # Webhook management
│   │   ├── audit/                    # Audit logging
│   │   └── [other-modules]/          # Other features
│   │
│   ├── blockchain/                   # Blockchain utilities
│   │   └── profile/                  # Stellar profile management
│   │
│   ├── types/                        # TypeScript type definitions
│   ├── health/                       # Health check endpoints
│   └── commands/                     # CLI commands
│
├── test/                             # E2E tests
│   ├── jest-e2e.json                 # Jest E2E config
│   ├── setup-env.ts                  # Test environment setup
│   └── [test-files]/                 # E2E test files
│
├── migrations/                       # Database migrations
├── scripts/                          # Utility scripts
├── package.json                      # Dependencies
├── tsconfig.json                     # TypeScript config
├── nest-cli.json                     # NestJS CLI config
├── Makefile                          # Development commands
└── README.md                         # Project documentation
```

### Key Directories Explained

**`src/common/`** - Shared utilities used across modules

- Decorators: Custom route/parameter decorators
- DTOs: Data Transfer Objects for validation
- Errors: Error types and handling
- Filters: Exception filters for error responses
- Interceptors: Request/response interceptors
- Middleware: Express middleware
- Pipes: Validation and transformation pipes
- Services: Shared services (email, storage, etc.)
- Utils: Helper functions

**`src/modules/`** - Feature modules organized by domain

- Each module is self-contained
- Contains controller, service, repository, entity, DTO
- Can have sub-modules for complex features

**`src/database/`** - Database configuration and migrations

- `data-source.ts` - TypeORM configuration
- `migration-runner.ts` - Safe migration execution
- `migrations/` - Migration files (timestamped)
- `seeds/` - Seed data for development

**`test/`** - End-to-end tests

- Tests against real database
- Tests API contracts
- Tests integration scenarios

---

## Module Development

### Creating a New Module

**Step 1: Generate module structure**

```bash
cd backend
nest generate module modules/my-feature
nest generate controller modules/my-feature
nest generate service modules/my-feature
```

**Step 2: Create entity**

```typescript
// src/modules/my-feature/entities/my-feature.entity.ts

import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('my_features')
export class MyFeature {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;
}
```

**Step 3: Create DTO**

```typescript
// src/modules/my-feature/dto/create-my-feature.dto.ts

import { IsString, IsNotEmpty } from 'class-validator';

export class CreateMyFeatureDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}
```

**Step 4: Create repository**

```typescript
// src/modules/my-feature/repositories/my-feature.repository.ts

import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { MyFeature } from '../entities/my-feature.entity';

@Injectable()
export class MyFeatureRepository extends Repository<MyFeature> {
  constructor(private readonly dataSource: DataSource) {
    super(MyFeature, dataSource.createEntityManager());
  }

  async findById(id: string): Promise<MyFeature> {
    return this.findOne({ where: { id } });
  }

  async findAll(): Promise<MyFeature[]> {
    return this.find();
  }
}
```

**Step 5: Create service**

```typescript
// src/modules/my-feature/my-feature.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateMyFeatureDto } from './dto/create-my-feature.dto';
import { MyFeatureRepository } from './repositories/my-feature.repository';

@Injectable()
export class MyFeatureService {
  constructor(private readonly repository: MyFeatureRepository) {}

  async create(dto: CreateMyFeatureDto) {
    const entity = this.repository.create(dto);
    return this.repository.save(entity);
  }

  async findAll() {
    return this.repository.findAll();
  }

  async findById(id: string) {
    const entity = await this.repository.findById(id);
    if (!entity) {
      throw new NotFoundException(`MyFeature with id ${id} not found`);
    }
    return entity;
  }
}
```

**Step 6: Create controller**

```typescript
// src/modules/my-feature/my-feature.controller.ts

import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { MyFeatureService } from './my-feature.service';
import { CreateMyFeatureDto } from './dto/create-my-feature.dto';

@Controller('my-features')
export class MyFeatureController {
  constructor(private readonly service: MyFeatureService) {}

  @Post()
  create(@Body() dto: CreateMyFeatureDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.service.findById(id);
  }
}
```

**Step 7: Update module**

```typescript
// src/modules/my-feature/my-feature.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MyFeatureController } from './my-feature.controller';
import { MyFeatureService } from './my-feature.service';
import { MyFeatureRepository } from './repositories/my-feature.repository';
import { MyFeature } from './entities/my-feature.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MyFeature])],
  controllers: [MyFeatureController],
  providers: [MyFeatureService, MyFeatureRepository],
  exports: [MyFeatureService],
})
export class MyFeatureModule {}
```

**Step 8: Register in app.module.ts**

```typescript
// src/app.module.ts

import { MyFeatureModule } from './modules/my-feature/my-feature.module';

@Module({
  imports: [
    // ... other modules
    MyFeatureModule,
  ],
})
export class AppModule {}
```

---

## Database & Migrations

### Creating Migrations

**Generate migration from entity changes**

```bash
cd backend
pnpm run migration:generate -- -n AddMyFeatureTable
```

**Create empty migration**

```bash
pnpm run migration:create -- -n AddMyFeatureTable
```

### Migration Best Practices

```typescript
// src/migrations/1234567890000-AddMyFeatureTable.ts

import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class AddMyFeatureTable1234567890000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'my_features',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'name',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('my_features');
  }
}
```

### Running Migrations

```bash
# Run pending migrations
pnpm run migration:run

# Run migrations safely (with rollback on error)
pnpm run migration:run:safe

# Show pending migrations
pnpm run migration:show

# Revert last migration
pnpm run migration:revert

# Production migration
pnpm run migration:run:prod
```

### Seeding Data

```typescript
// src/database/seeds/seed-my-feature.ts

import { DataSource } from 'typeorm';
import { MyFeature } from '../../modules/my-feature/entities/my-feature.entity';

export async function seedMyFeature(dataSource: DataSource) {
  const repository = dataSource.getRepository(MyFeature);

  const features = [{ name: 'Feature 1' }, { name: 'Feature 2' }];

  for (const feature of features) {
    const existing = await repository.findOne({
      where: { name: feature.name },
    });
    if (!existing) {
      await repository.save(feature);
    }
  }
}
```

---

## Testing Strategy

### Unit Tests

```typescript
// src/modules/my-feature/my-feature.service.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { MyFeatureService } from './my-feature.service';
import { MyFeatureRepository } from './repositories/my-feature.repository';

describe('MyFeatureService', () => {
  let service: MyFeatureService;
  let repository: MyFeatureRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MyFeatureService,
        {
          provide: MyFeatureRepository,
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findById: jest.fn(),
            findAll: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<MyFeatureService>(MyFeatureService);
    repository = module.get<MyFeatureRepository>(MyFeatureRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new feature', async () => {
      const dto = { name: 'Test Feature' };
      const entity = { id: '1', ...dto };

      jest.spyOn(repository, 'create').mockReturnValue(entity as any);
      jest.spyOn(repository, 'save').mockResolvedValue(entity as any);

      const result = await service.create(dto);

      expect(result).toEqual(entity);
      expect(repository.create).toHaveBeenCalledWith(dto);
      expect(repository.save).toHaveBeenCalledWith(entity);
    });
  });
});
```

### E2E Tests

```typescript
// test/my-feature.e2e-spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('MyFeature (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /my-features', () => {
    it('should create a new feature', () => {
      return request(app.getHttpServer())
        .post('/my-features')
        .send({ name: 'Test Feature' })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.name).toBe('Test Feature');
        });
    });
  });

  describe('GET /my-features', () => {
    it('should return all features', () => {
      return request(app.getHttpServer())
        .get('/my-features')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });
});
```

### Running Tests

```bash
# Run all unit tests
pnpm run test

# Run tests in watch mode
pnpm run test:watch

# Run tests with coverage
pnpm run test:cov

# Run E2E tests
pnpm run test:e2e

# Run specific test file
pnpm run test -- my-feature.service.spec.ts
```

---

## API Development

### Creating API Endpoints

```typescript
// src/modules/my-feature/my-feature.controller.ts

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { MyFeatureService } from './my-feature.service';
import { CreateMyFeatureDto } from './dto/create-my-feature.dto';
import { UpdateMyFeatureDto } from './dto/update-my-feature.dto';

@ApiTags('my-features')
@Controller('my-features')
export class MyFeatureController {
  constructor(private readonly service: MyFeatureService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new feature' })
  @ApiResponse({ status: 201, description: 'Feature created' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateMyFeatureDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all features' })
  @ApiResponse({ status: 200, description: 'List of features' })
  findAll(@Query('page') page = 1, @Query('limit') limit = 10) {
    return this.service.findAll({ page, limit });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get feature by ID' })
  @ApiResponse({ status: 200, description: 'Feature found' })
  @ApiResponse({ status: 404, description: 'Feature not found' })
  findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update feature' })
  @ApiResponse({ status: 200, description: 'Feature updated' })
  update(@Param('id') id: string, @Body() dto: UpdateMyFeatureDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete feature' })
  @ApiResponse({ status: 204, description: 'Feature deleted' })
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
```

### Swagger Documentation

```typescript
// src/main.ts

import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

const config = new DocumentBuilder()
  .setTitle('Chioma API')
  .setDescription('Property rental platform API')
  .setVersion('1.0')
  .addBearerAuth()
  .build();

const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api/docs', app, document);
```

---

## PR Requirements & CI/CD Pipeline

### Before Creating a PR

Run the complete pipeline check locally:

```bash
cd backend
make ci
```

This runs:

1. **Install** - Install dependencies
2. **Format Check** - Prettier formatting
3. **Lint** - ESLint code quality
4. **TypeCheck** - TypeScript type checking
5. **Test** - Unit tests with coverage
6. **Build** - Production build

### What the Pipeline Checks

#### 1. ESLint (Code Quality)

Checks for:

- Unused variables
- Missing error handling
- Security issues
- NestJS best practices

**Fix ESLint errors:**

```bash
cd backend
pnpm run lint
```

#### 2. Prettier (Code Formatting)

Ensures consistent formatting.

**Format your code:**

```bash
cd backend
pnpm run format
```

#### 3. TypeScript Type Checking

Verifies type safety.

**Check types:**

```bash
cd backend
npx tsc --noEmit
```

#### 4. Jest Unit Tests

Runs all unit tests with coverage.

**Run tests:**

```bash
cd backend
pnpm run test
```

#### 5. Production Build

Verifies the build succeeds.

**Build:**

```bash
cd backend
pnpm run build
```

### Additional Pipeline Checks

**E2E Tests** (requires PostgreSQL)

```bash
cd backend
pnpm run test:e2e
```

**Migration Rollback Verification**

```bash
cd backend
pnpm run migration:verify-rollback
```

**Security Scanning**

```bash
cd backend
make security-lint
make security-test
```

## API Documentation

- [docs/README.md](./docs/README.md) — documentation hub
- [docs/api/api-documentation.md](./docs/api/api-documentation.md) — API reference
- [docs/api/USAGE_GUIDE.md](./docs/api/USAGE_GUIDE.md) — integration walkthrough
- Interactive Swagger: `http://localhost:5000/api/docs` (when server is running)

**OpenAPI Generation**

```bash
cd backend
pnpm run openapi:generate
```

### PR Checklist

Before submitting a PR:

- [ ] Code follows style guidelines
- [ ] All tests pass (`make ci`)
- [ ] No console errors or warnings
- [ ] TypeScript types are correct
- [ ] Database migrations are included (if needed)
- [ ] API documentation is updated
- [ ] Error handling is comprehensive
- [ ] Security best practices are followed
- [ ] No breaking changes to existing APIs
- [ ] Commit messages are clear and descriptive

### PR Description Template

```markdown
## Description

Brief description of changes

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Database migration
- [ ] Documentation update

## Related Issues

Closes #123

## Testing

How to test these changes

## Database Changes

Any migrations or schema changes

## Security Considerations

Any security implications

## Checklist

- [ ] Code follows style guidelines
- [ ] Tests pass locally (`make ci`)
- [ ] No new warnings generated
- [ ] Documentation updated
- [ ] Migrations tested
```

### Common CI/CD Failures & Fixes

**ESLint Errors**

```bash
# View errors
pnpm run lint

# Auto-fix most errors
pnpm run lint
```

**Prettier Formatting**

```bash
# Check formatting
pnpm run format:check

# Auto-format
pnpm run format
```

**TypeScript Errors**

```bash
# Check for type errors
npx tsc --noEmit
```

**Test Failures**

```bash
# Run tests with verbose output
pnpm run test -- --verbose

# Run specific test file
pnpm run test -- my-feature.service.spec.ts

# Watch mode for development
pnpm run test:watch
```

**Build Failures**

```bash
# Clean and rebuild
rm -rf dist node_modules
pnpm install
pnpm run build
```

---

## Development Workflow

### Setting Up Your Environment

```bash
# 1. Clone the repository
git clone <repo-url>
cd chioma/backend

# 2. Install dependencies
pnpm install

# 3. Set up environment variables
cp .env.example .env.development

# 4. Start PostgreSQL (using Docker)
docker-compose up -d postgres

# 5. Run migrations
pnpm run migration:run

# 6. Seed data (optional)
pnpm run seed:data

# 7. Start development server
pnpm run start:dev
```

### Daily Development Commands

```bash
# Start development server
pnpm run start:dev

# Run tests in watch mode
pnpm run test:watch

# Check code quality
pnpm run lint

# Format code
pnpm run format

# Full pipeline check (before PR)
make ci

# Generate OpenAPI spec
pnpm run openapi:generate

# View API documentation
# http://localhost:5000/api/docs
```

### Git Workflow

```bash
# 1. Create feature branch
git checkout -b feature/my-feature

# 2. Make changes and commit
git add .
git commit -m "feat: add new feature"

# 3. Run pipeline checks
make ci

# 4. Push and create PR
git push origin feature/my-feature
```

### Debugging Tips

**Debug Mode**

```bash
pnpm run start:debug
# Then attach debugger to localhost:9229
```

**Console Logging**

```typescript
import { Logger } from '@nestjs/common';

const logger = new Logger('MyFeature');
logger.log('Message', { data });
logger.error('Error', error);
logger.warn('Warning');
logger.debug('Debug info');
```

**Database Debugging**

```bash
# Connect to PostgreSQL
psql -h localhost -U postgres -d chioma_db

# View tables
\dt

# View table structure
\d my_features

# Run query
SELECT * FROM my_features;
```

---

## Best Practices

### Error Handling

```typescript
import { HttpException, HttpStatus, NotFoundException } from '@nestjs/common';

// Use specific exceptions
throw new NotFoundException('User not found');
throw new BadRequestException('Invalid input');
throw new UnauthorizedException('Invalid credentials');
throw new ForbiddenException('Access denied');

// Custom exceptions
throw new HttpException(
  { message: 'Custom error', code: 'CUSTOM_ERROR' },
  HttpStatus.BAD_REQUEST,
);
```

### Validation

```typescript
import { IsString, IsEmail, IsNotEmpty, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}
```

### Logging

```typescript
import { Logger } from '@nestjs/common';

@Injectable()
export class MyService {
  private readonly logger = new Logger(MyService.name);

  async doSomething() {
    this.logger.log('Starting operation');
    try {
      // Do something
      this.logger.log('Operation completed');
    } catch (error) {
      this.logger.error('Operation failed', error);
      throw error;
    }
  }
}
```

### Security

1. **Input Validation**
   - Always validate user input with class-validator
   - Use DTOs for request bodies

2. **Authentication**
   - Use JWT tokens with expiration
   - Implement refresh token rotation

3. **Authorization**
   - Use role-based access control (RBAC)
   - Check permissions in guards

4. **Encryption**
   - Encrypt sensitive data at rest
   - Use HTTPS for all communications

5. **Rate Limiting**
   - Implement rate limiting on sensitive endpoints
   - Use Redis for distributed rate limiting

### Performance

See [Performance Tuning Guidelines](./docs/PERFORMANCE_TUNING_GUIDELINES.md) for operational tuning (database, cache, queues, observability).

1. **Database Queries**
   - Use indexes on frequently queried columns
   - Avoid N+1 queries with eager loading
   - Use pagination for large result sets

2. **Caching**
   - Cache frequently accessed data
   - Use Redis for distributed caching
   - Implement cache invalidation

3. **Async Operations**
   - Use Bull queues for long-running tasks
   - Implement background jobs
   - Use event emitters for decoupling

### Testing

1. **Unit Tests**
   - Test business logic in isolation
   - Mock external dependencies
   - Aim for >80% coverage

2. **E2E Tests**
   - Test complete workflows
   - Use real database
   - Test error scenarios

3. **Test Organization**
   - One test file per service/controller
   - Descriptive test names
   - Use beforeEach/afterEach for setup/teardown

### Documentation

1. **Code Comments**
   - Explain WHY, not WHAT
   - Document complex logic
   - Keep comments up-to-date

2. **API Documentation**
   - Use Swagger decorators
   - Document all endpoints
   - Include examples

3. **README Files**
   - Add README.md to complex modules
   - Document setup and usage
   - Include examples

---

## Troubleshooting

### Common Issues

**Port 5000 already in use**

```bash
# Kill process on port 5000
lsof -ti:5000 | xargs kill -9

# Or use different port
PORT=5001 pnpm run start:dev
```

**Database connection errors**

```bash
# Check PostgreSQL is running
docker-compose ps

# Check connection string in .env
# Verify database exists
psql -h localhost -U postgres -l
```

**Module not found errors**

```bash
# Clear build cache
rm -rf dist

# Reinstall dependencies
pnpm install

# Restart dev server
pnpm run start:dev
```

**TypeScript errors**

```bash
# Check for type errors
npx tsc --noEmit

# Generate types
pnpm run build
```

---

## Resources

- [NestJS Documentation](https://docs.nestjs.com)
- [TypeORM Documentation](https://typeorm.io)
- [PostgreSQL Documentation](https://www.postgresql.org/docs)
- [Jest Documentation](https://jestjs.io)
- [Stellar SDK Documentation](https://developers.stellar.org)

---

## Support and Communication

For questions or assistance:

- Review existing issues and pull requests for similar cases
- Examine established modules for architectural patterns
- Participate in team discussions and code reviews
- Submit detailed issue reports for bugs or feature requests

We appreciate your contributions to the Chioma platform.
