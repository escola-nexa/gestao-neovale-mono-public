import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('profiles')
export class Profiles {
  @Column({ name: 'avatar_url', type: 'varchar', nullable: true })
  avatarUrl: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'email', type: 'varchar' })
  email: string;

  @Column({ name: 'full_name', type: 'varchar' })
  fullName: string;

  @Column({ name: 'password', type: 'varchar', nullable: true, select: false })
  password?: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'is_active', type: 'boolean' })
  isActive: boolean;

  @Column({ name: 'organization_id', type: 'varchar', nullable: true })
  organizationId: string;

  @Column({ name: 'password_changed_at', type: 'varchar', nullable: true })
  passwordChangedAt: string;

  @Column({ name: 'phone', type: 'varchar', nullable: true })
  phone: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'user_id', type: 'varchar' })
  userId: string;

}
