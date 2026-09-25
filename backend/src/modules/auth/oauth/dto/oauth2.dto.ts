import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { OAuth2Provider } from '../oauth2.types';

export class OAuth2CallbackDto {
  @IsEnum(OAuth2Provider)
  provider: OAuth2Provider;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
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
