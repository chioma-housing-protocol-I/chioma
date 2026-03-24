import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { PropertiesService } from './properties.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { QueryPropertyDto } from './dto/query-property.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';
import { ListingStatus } from './entities/property.entity';

@ApiTags('Properties')
@Controller('properties')
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.LANDLORD, UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new property listing',
    description:
      'Creates a new property listing. Only landlords and admins can create properties.',
  })
  @ApiResponse({
    status: 201,
    description: 'Property created successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  async create(
    @Body() createPropertyDto: CreatePropertyDto,
    @CurrentUser() user: User,
  ) {
    return await this.propertiesService.create(createPropertyDto, user.id);
  }

  @Get()
  @ApiOperation({
    summary: 'List all properties',
    description:
      'Retrieve a paginated list of property listings with optional filtering. By default, returns only published properties for public access.',
  })
  @ApiResponse({
    status: 200,
    description: 'Properties retrieved successfully',
  })
  async findAll(@Query() query: QueryPropertyDto) {
    // For public access, only show published properties unless status is explicitly set
    if (!query.status) {
      query.status = ListingStatus.PUBLISHED;
    }
    return await this.propertiesService.findAll(query);
  }

  @Get('my-properties')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'List current user properties',
    description: 'Retrieve all properties owned by the authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: 'User properties retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token required',
  })
  async findMyProperties(
    @Query() query: QueryPropertyDto,
    @CurrentUser() user: User,
  ) {
    return await this.propertiesService.findAll({
      ...query,
      ownerId: user.id,
      status: query.status, // Allow filtering by any status for own properties
    });
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a specific property',
    description:
      'Retrieve detailed information about a specific property by its ID. Only published properties are publicly accessible.',
  })
  @ApiParam({
    name: 'id',
    description: 'Property UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Property retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Property not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return await this.propertiesService.findOnePublic(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update a property',
    description:
      'Update an existing property. Only the owner or admin can update a property.',
  })
  @ApiParam({
    name: 'id',
    description: 'Property UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Property updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - not the owner or admin',
  })
  @ApiResponse({ status: 404, description: 'Property not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updatePropertyDto: UpdatePropertyDto,
    @CurrentUser() user: User,
  ) {
    return await this.propertiesService.update(id, updatePropertyDto, user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a property',
    description:
      'Delete a property listing. Only the owner or admin can delete a property.',
  })
  @ApiParam({
    name: 'id',
    description: 'Property UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({ status: 204, description: 'Property deleted successfully' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - not the owner or admin',
  })
  @ApiResponse({ status: 404, description: 'Property not found' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return await this.propertiesService.remove(id, user);
  }

  @Post(':id/publish')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Publish a property',
    description:
      'Change property status from draft to published. Only the owner or admin can publish.',
  })
  @ApiParam({
    name: 'id',
    description: 'Property UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Property published successfully',
  })
  @ApiResponse({ status: 400, description: 'Property cannot be published' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - not the owner or admin',
  })
  @ApiResponse({ status: 404, description: 'Property not found' })
  async publish(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return await this.propertiesService.publish(id, user);
  }

  @Post(':id/archive')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Archive a property',
    description:
      'Archive a property listing. Only the owner or admin can archive.',
  })
  @ApiParam({
    name: 'id',
    description: 'Property UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({ status: 200, description: 'Property archived successfully' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - not the owner or admin',
  })
  @ApiResponse({ status: 404, description: 'Property not found' })
  async archive(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return await this.propertiesService.archive(id, user);
  }

  @Post(':id/mark-rented')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mark a property as rented',
    description:
      'Mark a property as rented. Only the owner or admin can change this status.',
  })
  @ApiParam({
    name: 'id',
    description: 'Property UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Property marked as rented successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - not the owner or admin',
  })
  @ApiResponse({ status: 404, description: 'Property not found' })
  async markAsRented(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return await this.propertiesService.markAsRented(id, user);
  }
}
