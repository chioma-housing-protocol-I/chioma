import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { TemplateClause } from './template-clause.entity';

@Entity('agreement_templates')
export class AgreementTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text' })
  baseContent: string;

  @Column()
  jurisdiction: string;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => TemplateClause, (clause) => clause.template, {
    cascade: true,
  })
  clauses: TemplateClause[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
