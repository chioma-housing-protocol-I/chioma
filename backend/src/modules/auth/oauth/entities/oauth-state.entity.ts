import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { OAuth2Provider } from '../oauth2.types';

@Entity('oauth_states')
@Index(['expiresAt'])
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

  // Lookup is by primary key; this only checks provider binding and expiry.
  isValid(provider: OAuth2Provider, now: Date = new Date()): boolean {
    if (this.provider !== provider) {
      return false;
    }
    if (this.expiresAt.getTime() <= now.getTime()) {
      return false;
    }
    return true;
  }
}
