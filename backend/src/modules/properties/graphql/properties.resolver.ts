import { Args, Query, Resolver } from '@nestjs/graphql';
import { PropertiesService } from '../properties.service';
import { QueryPropertyDto } from '../dto/query-property.dto';
import { ListingStatus } from '../entities/property.entity';
import { PropertiesArgs } from './property-filter.args';
import { PropertyObjectType } from './property.object-type';
import { PropertyPageObjectType } from './property-page.object-type';

/**
 * Read-only GraphQL surface for properties (#2050). Runs alongside the
 * existing REST endpoints — not a replacement — so mobile/web clients can
 * ask for only the fields they render instead of the full REST payload
 * (which eagerly joins images/amenities/owner on every list request).
 */
@Resolver(() => PropertyObjectType)
export class PropertiesResolver {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Query(() => PropertyPageObjectType, { name: 'properties' })
  async properties(
    @Args() args: PropertiesArgs,
  ): Promise<PropertyPageObjectType> {
    const query = Object.assign(new QueryPropertyDto(), args);
    if (!query.status) {
      query.status = ListingStatus.PUBLISHED;
    }
    return this.propertiesService.findAll(
      query,
    ) as Promise<PropertyPageObjectType>;
  }

  @Query(() => PropertyObjectType, { name: 'property', nullable: true })
  async property(
    @Args('id', { type: () => String }) id: string,
  ): Promise<PropertyObjectType> {
    return this.propertiesService.findOnePublic(
      id,
    ) as unknown as Promise<PropertyObjectType>;
  }
}
