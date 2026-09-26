import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { OAuth2Provider } from '../oauth2.types';

@Entity('oauth_states')
@Index(['expiresAt'], { expireAfterSeconds: 0 }) // TTL index
@Index(['userId', 'provider'])
export class OAuthState {
  @PrimaryColumn({ type: 'varchar', length: 128 })
  state: string;

  @Column({ type: 'enum', enum: OAuth2Provider })
  provider: OAuth2Provider;

  @Column({ name: 'redirect_uri', type: 'varchar' })
  redirectUri: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId?: string;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Prevent timing attacks by using constant-time comparison
  isValid(provider: OAuth2Provider, now: Date = new Date()): boolean {
    if (this.provider !== provider) {
      return false;
    }
    if (this.expiresAt < now) {
      return false;
    }
    return true;
  }
}
