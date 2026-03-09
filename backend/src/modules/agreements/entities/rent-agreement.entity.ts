import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('rent_agreements')
export class RentAgreement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Add your specific rent agreement columns below as you build out the feature
  @Column({ default: 'pending' })
  status: string;
}
