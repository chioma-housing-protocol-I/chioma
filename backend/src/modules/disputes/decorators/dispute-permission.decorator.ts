import { SetMetadata } from '@nestjs/common';

export const DISPUTE_PERMISSION_KEY = 'dispute_permission';
export const DisputePermission = (permission: string) =>
  SetMetadata(DISPUTE_PERMISSION_KEY, permission);
