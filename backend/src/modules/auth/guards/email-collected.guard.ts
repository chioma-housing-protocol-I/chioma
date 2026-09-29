import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_EMAIL_KEY } from '../decorators/require-email.decorator';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class EmailCollectedGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<boolean>(
      REQUIRE_EMAIL_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!required) {
      return true;
    }

    const { user } = context
      .switchToHttp()
      .getRequest<{ user?: User }>();

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    if (!user.emailCollectedAt) {
      throw new ForbiddenException(
        'Email onboarding must be completed before performing this operation',
      );
    }

    return true;
  }
}
