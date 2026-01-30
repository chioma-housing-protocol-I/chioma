export class AuthResponseDto {
  accessToken: string | null;
  refreshToken: string | null;
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    role: string;
  };
  mfaRequired?: boolean;
  mfaToken?: string;
}

export class MessageResponseDto {
  message: string;
}
