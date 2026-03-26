import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { AgreementTemplate } from './agreement-template.entity';

@Entity('template_clauses')
export class TemplateClause {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ default: 0 })
  displayOrder: number;

  @Column({ default: false })
  isMandatory: boolean;

  @ManyToOne(() => AgreementTemplate, (template) => template.clauses)
  template: AgreementTemplate;
}
