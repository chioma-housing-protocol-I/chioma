declare module 'speakeasy' {
  export interface GenerateSecretOptions {
    name?: string;
    length?: number;
  }

  export interface GenerateSecretResult {
    base32: string;
    otpauth_url?: string;
  }

  export function generateSecret(
    options?: GenerateSecretOptions,
  ): GenerateSecretResult;

  export namespace totp {
    export interface VerifyOptions {
      secret: string;
      encoding: string;
      token: string;
      window?: number;
    }

    export function verify(options: VerifyOptions): boolean;
  }
}
