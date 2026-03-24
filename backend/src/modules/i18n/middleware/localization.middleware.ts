import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { I18nService } from '../i18n.service';

export interface LocalizedRequest extends Request {
  locale?: string;
  timezone?: string;
}

@Injectable()
export class LocalizationMiddleware implements NestMiddleware {
  constructor(private readonly i18nService: I18nService) {}

  use(req: LocalizedRequest, _res: Response, next: NextFunction): void {
    const languageHeader =
      req.header('accept-language') || req.header('x-language');
    const timezoneHeader = req.header('x-timezone');

    req.locale = this.i18nService.resolveLanguage(languageHeader);
    req.timezone = timezoneHeader || 'UTC';

    next();
  }
}
