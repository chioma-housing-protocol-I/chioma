import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  type: 'access' | 'refresh';
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET is required');
    }
    super(
      {
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        secretOrKey: secret,
        passReqToCallback: false,
      },
      async (payload: JwtPayload, done) => {
        if (payload.type !== 'access') {
          return done(new UnauthorizedException('Invalid token type'), false);
        }

        const user = await this.authService.validateUserById(payload.sub);

        if (!user) {
          return done(
            new UnauthorizedException('User not found or inactive'),
            false,
          );
        }

        return done(null, user);
      },
    );
  }
}
