import { Field, Int, ObjectType } from '@nestjs/graphql';
import { PropertyObjectType } from './property.object-type';

@ObjectType('PropertyPage')
export class PropertyPageObjectType {
  @Field(() => [PropertyObjectType])
  data: PropertyObjectType[];

  @Field(() => Int)
  total: number;

  @Field(() => Int)
  page: number;

  @Field(() => Int)
  limit: number;

  @Field(() => Int)
  totalPages: number;
}
