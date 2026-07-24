import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { OAuth2Provider } from '../oauth2.types';

@Entity('oauth_accounts')
@Index(['userId', 'provider'], { unique: true })
@Index(['provider', 'providerUserId'], { unique: true })
export class OAuthAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ type: 'enum', enum: OAuth2Provider })
  provider: OAuth2Provider;

  @Column({ name: 'provider_user_id', type: 'varchar' })
  providerUserId: string;

  @Column({ type: 'varchar' })
  email: string;

  @CreateDateColumn({ name: 'linked_at' })
  linkedAt: Date;
}
