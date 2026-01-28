import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { AuthMethod } from '../../users/entities/user.entity';

@Entity('auth_metrics')
@Index(['timestamp'])
@Index(['authMethod'])
@Index(['success'])
export class AuthMetric {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: AuthMethod,
  })
  authMethod: AuthMethod;

  @Column()
  success: boolean;

  @Column({
    type: 'int',
    comment: 'Response time in milliseconds',
  })
  duration: number;

  @Column({
    type: 'varchar',
    length: 45,
    nullable: true,
    comment: 'Client IP address',
  })
  ipAddress?: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'User agent string',
  })
  userAgent?: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Error message if authentication failed',
  })
  errorMessage?: string;

  @CreateDateColumn({
    type: 'timestamp with time zone',
    comment: 'When the authentication attempt occurred',
  })
  timestamp: Date;
}
