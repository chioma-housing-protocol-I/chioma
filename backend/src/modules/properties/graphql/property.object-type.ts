import {
  Field,
  Float,
  ID,
  Int,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';
import { ListingStatus, PropertyType } from '../entities/property.entity';

registerEnumType(PropertyType, { name: 'PropertyType' });
registerEnumType(ListingStatus, { name: 'ListingStatus' });

/**
 * Deliberately a subset of the Property entity's columns: the point of
 * this parallel API (#2050) is to let clients request only the fields
 * they render, instead of the full REST payload (relations included).
 */
@ObjectType('Property')
export class PropertyObjectType {
  @Field(() => ID)
  id: string;

  @Field()
  title: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => PropertyType)
  type: PropertyType;

  @Field(() => ListingStatus)
  status: ListingStatus;

  @Field({ nullable: true })
  city?: string;

  @Field({ nullable: true })
  state?: string;

  @Field({ nullable: true })
  country?: string;

  @Field(() => Float)
  price: number;

  @Field()
  currency: string;

  @Field(() => Int, { nullable: true })
  bedrooms?: number;

  @Field(() => Int, { nullable: true })
  bathrooms?: number;

  @Field(() => Boolean)
  isFurnished: boolean;

  @Field(() => Boolean)
  hasParking: boolean;

  @Field(() => Boolean)
  petsAllowed: boolean;

  @Field(() => Int)
  viewCount: number;

  @Field(() => Int)
  favoriteCount: number;

  @Field()
  createdAt: Date;
}
