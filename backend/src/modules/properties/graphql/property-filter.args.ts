import { ArgsType, Field, Float, Int } from '@nestjs/graphql';
import { ListingStatus, PropertyType } from '../entities/property.entity';
// PropertyType/ListingStatus are registered as GraphQL enums once, in
// property.object-type.ts (registerEnumType throws if called twice).
import './property.object-type';

@ArgsType()
export class PropertiesArgs {
  @Field(() => Int, { defaultValue: 1 })
  page: number;

  @Field(() => Int, { defaultValue: 20 })
  limit: number;

  @Field(() => PropertyType, { nullable: true })
  type?: PropertyType;

  @Field(() => ListingStatus, { nullable: true })
  status?: ListingStatus;

  @Field(() => Float, { nullable: true })
  minPrice?: number;

  @Field(() => Float, { nullable: true })
  maxPrice?: number;

  @Field({ nullable: true })
  city?: string;
}
