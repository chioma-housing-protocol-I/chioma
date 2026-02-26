import { SetMetadata } from '@nestjs/common';
import { EndpointCategory } from '../types/rate-limit.types';

export const RATE_LIMIT_CATEGORY_KEY = 'rate_limit_category';
export const RATE_LIMIT_POINTS_KEY = 'rate_limit_points';
export const RATE_LIMIT_SKIP_KEY = 'rate_limit_skip';

export const RateLimitCategory = (category: EndpointCategory) =>
  SetMetadata(RATE_LIMIT_CATEGORY_KEY, category);

export const RateLimitPoints = (points: number) =>
  SetMetadata(RATE_LIMIT_POINTS_KEY, points);

export const SkipRateLimit = () =>
  SetMetadata(RATE_LIMIT_SKIP_KEY, true);
