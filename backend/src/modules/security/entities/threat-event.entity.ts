import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum ThreatLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum ThreatType {
  BRUTE_FORCE = 'brute_force',
  CREDENTIAL_STUFFING = 'credential_stuffing',
  SQL_INJECTION = 'sql_injection',
  XSS_ATTEMPT = 'xss_attempt',
  PATH_TRAVERSAL = 'path_traversal',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  SUSPICIOUS_IP = 'suspicious_ip',
  ACCOUNT_TAKEOVER = 'account_takeover',
  PRIVILEGE_ESCALATION = 'privilege_escalation',
  DATA_EXFILTRATION = 'data_exfiltration',
  ANOMALOUS_BEHAVIOR = 'anomalous_behavior',
  BOT_ACTIVITY = 'bot_activity',
  REPLAY_ATTACK = 'replay_attack',
}

export enum ThreatStatus {
  DETECTED = 'detected',
  INVESTIGATING = 'investigating',
  CONFIRMED = 'confirmed',
  MITIGATED = 'mitigated',
  FALSE_POSITIVE = 'false_positive',
}

@Entity('threat_events')
@Index(['ipAddress', 'createdAt'])
@Index(['userId', 'createdAt'])
@Index(['threatType', 'status'])
@Index(['threatLevel', 'createdAt'])
export class ThreatEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', nullable: true, type: 'varchar' })
  userId: string | null;

  @Column({ name: 'ip_address', nullable: true, type: 'varchar' })
  ipAddress: string | null;

  @Column({ name: 'user_agent', nullable: true, type: 'text' })
  userAgent: string | null;

  @Column({ name: 'request_path', nullable: true, type: 'varchar' })
  requestPath: string | null;

  @Column({ name: 'request_method', nullable: true, type: 'varchar' })
  requestMethod: string | null;

  @Column({
    name: 'threat_type',
    type: 'enum',
    enum: ThreatType,
  })
  threatType: ThreatType;

  @Column({
    name: 'threat_level',
    type: 'enum',
    enum: ThreatLevel,
    default: ThreatLevel.MEDIUM,
  })
  threatLevel: ThreatLevel;

  @Column({
    type: 'enum',
    enum: ThreatStatus,
    default: ThreatStatus.DETECTED,
  })
  status: ThreatStatus;

  @Column({ type: 'jsonb', nullable: true })
  evidence: any;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'blocked', type: 'boolean', default: false })
  blocked: boolean;

  @Column({ name: 'auto_mitigated', type: 'boolean', default: false })
  autoMitigated: boolean;

  @Column({ name: 'mitigation_action', nullable: true, type: 'varchar' })
  mitigationAction: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
