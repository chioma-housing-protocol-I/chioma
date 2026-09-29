import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiResponse,
} from '@nestjs/swagger';
import { PropertyWizardService } from './property-wizard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PropertyData } from './entities/property-listing-draft.entity';
import axios from 'axios';

@ApiTags('Property Wizard')
@Controller('property-listings/wizard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.ADMIN)
@ApiBearerAuth('JWT-auth')
export class PropertyWizardController {
  constructor(private readonly wizardService: PropertyWizardService) {}

  @ApiResponse({ status: 201, description: 'Created' })
  @Post('start')
  @ApiOperation({ summary: 'Start a new property listing wizard' })
  async start(@CurrentUser() user: User) {
    return await this.wizardService.start(user.id);
  }

  @ApiResponse({ status: 200, description: 'Retrieved' })
  @Get(':id/draft')
  @ApiOperation({ summary: 'Get draft content' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return await this.wizardService.findDraft(id, user.id);
  }

  @ApiResponse({ status: 200, description: 'Updated' })
  @Patch(':id/step')
  @ApiOperation({ summary: 'Save progress and validate step' })
  async updateStep(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Body() body: { step: number; data: Partial<PropertyData> },
  ) {
    return await this.wizardService.updateStep(
      id,
      user.id,
      body.step,
      body.data,
    );
  }

  @ApiResponse({ status: 200, description: 'Deleted' })
  @Delete(':id/draft')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a draft' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    await this.wizardService.removeDraft(id, user.id);
  }

  @ApiResponse({ status: 201, description: 'Created' })
  @Post(':id/publish')
  @ApiOperation({ summary: 'Publish draft' })
  async publish(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return await this.wizardService.publish(id, user.id);
  }

  // AI Helpers
  @ApiResponse({ status: 200, description: 'Retrieved' })
  @Get(':id/ai/pricing-suggestion')
  @ApiOperation({ summary: 'AI pricing suggestion' })
  async getPricingSuggestion(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    try {
      const draft = await this.wizardService.findDraft(id, user.id);
      const { propertyType, address, bedrooms, bathrooms, squareFootage } =
        draft.data;

      const prompt = `Suggest a monthly rent range and security deposit for a ${propertyType} at ${address} with ${bedrooms} bedrooms, ${bathrooms} bathrooms, and ${squareFootage} sqft. Return JSON only with fields: suggestedRent (min, max), suggestedDeposit (min, max), reasoning.`;

      const response = await this.callAI(prompt);
      return { ...response, available: true };
    } catch (_error) {
      return { available: false };
    }
  }

  @ApiResponse({ status: 200, description: 'Retrieved' })
  @Get(':id/ai/description-suggestion')
  @ApiOperation({ summary: 'AI description suggestion' })
  async getDescriptionSuggestion(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    try {
      const draft = await this.wizardService.findDraft(id, user.id);
      const {
        propertyType,
        address,
        bedrooms,
        bathrooms,
        amenities,
        houseRules,
      } = draft.data;

      const prompt = `Generate a compelling property description and neighborhood blurb for a ${propertyType} at ${address} with ${bedrooms} bedrooms, ${bathrooms} bathrooms. Amenities: ${amenities?.join(', ')}. Rules: ${Object.keys(
        houseRules || {},
      )
        .filter((k) => houseRules?.[k])
        .join(
          ', ',
        )}. Return JSON only with fields: propertyDescription, neighborhoodDescription.`;

      const response = await this.callAI(prompt);
      return { ...response, available: true };
    } catch (_error) {
      return { available: false };
    }
  }

  @ApiResponse({ status: 200, description: 'Retrieved' })
  @Get(':id/ai/completeness-score')
  @ApiOperation({ summary: 'AI completeness score' })
  async getCompletenessScore(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    try {
      const draft = await this.wizardService.findDraft(id, user.id);
      const prompt = `Rate this listing completeness 0-100 and list specific improvements. Listing data: ${JSON.stringify(draft.data)}. Return JSON only with fields: score (number), improvements (string array).`;

      const response = await this.callAI(prompt);
      return { ...response, available: true };
    } catch (_error) {
      return { available: false };
    }
  }

  private async callAI(prompt: string) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('AI API KEY not configured');

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      },
      {
        headers: { Authorization: `Bearer ${apiKey}` },
      },
    );

    return JSON.parse(response.data.choices[0].message.content);
  }
}
