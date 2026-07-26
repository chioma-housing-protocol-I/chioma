import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
    Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Property } from '../../properties/entities/property.entity';

@Entity('favorites')
@Unique('unique_user_property', ['userId', 'propertyId'])
@Index('idx_user_id', ['userId'])
@Index('idx_property_id', ['propertyId'])
export class Favorite {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    userId: string;

    @Column({ type: 'uuid' })
    propertyId: string;

    @CreateDateColumn()
    createdAt: Date;

    @ManyToOne(() => User, { onDelete: 'CASCADE', eager: false })
    @JoinColumn({ name: 'userId' })
    user: User;

    @ManyToOne(() => Property, { onDelete: 'CASCADE', eager: false })
    @JoinColumn({ name: 'propertyId' })
    property: Property;
}
