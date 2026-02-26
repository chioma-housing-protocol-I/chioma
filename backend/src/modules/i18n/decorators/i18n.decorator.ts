import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { I18nRequest } from '../middleware/localization.middleware';
import { I18nContext, SupportedLanguage } from '../types/i18n.types';

export const I18n = createParamDecorator(
  (data: keyof I18nContext | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<I18nRequest>();
    const i18nContext = request.i18n;

    if (!i18nContext) {
      return undefined;
    }

    if (data) {
      return i18nContext[data];
    }

    return i18nContext;
  },
);

export const Language = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): SupportedLanguage => {
    const request = ctx.switchToHttp().getRequest<I18nRequest>();
    return request.i18n?.language || SupportedLanguage.ENGLISH;
  },
);
