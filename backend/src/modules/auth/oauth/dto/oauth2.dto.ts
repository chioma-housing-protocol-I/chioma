import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { OAuth2Provider } from '../oauth2.types';

/** Server-issued OAuth state: 32 random bytes, hex encoded. */
const OAUTH_STATE_FORMAT = /^[a-f0-9]{64}$/;

export class OAuth2CallbackDto {
  @IsEnum(OAuth2Provider)
  provider: OAuth2Provider;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  @Matches(OAUTH_STATE_FORMAT, { message: 'state has an invalid format' })
  state: string;

  @IsOptional()
  @IsString()
  redirectUri?: string;
}

export class OAuth2AuthorizeDto {
  @IsEnum(OAuth2Provider)
  provider: OAuth2Provider;

  @IsOptional()
  @IsString()
  redirectUri?: string;
}

export class OAuth2LinkDto {
  @IsEnum(OAuth2Provider)
  provider: OAuth2Provider;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  @Matches(OAUTH_STATE_FORMAT, { message: 'state has an invalid format' })
  state: string;

  @IsOptional()
  @IsString()
  redirectUri?: string;
}

export class OAuth2RevokeDto {
  @IsEnum(OAuth2Provider)
  provider: OAuth2Provider;

  @IsString()
  @IsNotEmpty()
  token: string;
}
