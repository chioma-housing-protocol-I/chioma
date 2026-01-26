import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { RentAgreement } from '../../rent/entities/rent-contract.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @OneToMany(() => RentAgreement, (contract) => contract.user)
  contracts: RentAgreement[];

  @CreateDateColumn()
  createdAt: Date;
}