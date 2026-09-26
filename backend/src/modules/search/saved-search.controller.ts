import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { SavedSearchService } from './saved-search.service';
import { CreateSavedSearchDto, SavedSearchDto } from './dto/saved-search.dto';

@ApiTags('Saved Searches')
@Controller('search/saved-searches')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class SavedSearchController {
  constructor(private readonly savedSearchService: SavedSearchService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "List the current user's saved searches" })
  @ApiResponse({
    status: 200,
    description: 'Retrieved',
    type: [SavedSearchDto],
  })
  async findAll(@CurrentUser() user: User): Promise<SavedSearchDto[]> {
    return this.savedSearchService.findAllForUser(user.id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Save a named filter set with optional alerts' })
  @ApiResponse({ status: 201, description: 'Created', type: SavedSearchDto })
  async create(
    @CurrentUser() user: User,
    @Body() dto: CreateSavedSearchDto,
  ): Promise<SavedSearchDto> {
    return this.savedSearchService.create(user.id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a saved search' })
  @ApiResponse({ status: 204, description: 'Deleted' })
  @ApiResponse({ status: 404, description: 'Saved search not found' })
  async remove(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.savedSearchService.remove(user.id, id);
  }
}
