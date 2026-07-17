import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('teacher_substitution_financial_access')
export class TeacherSubstitutionFinancialAccess {
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'granted_at', type: 'varchar' })
  grantedAt: string;

  @Column({ name: 'granted_by', type: 'varchar' })
  grantedBy: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'is_active', type: 'boolean' })
  isActive: boolean;

  @Column({ name: 'notes', type: 'varchar', nullable: true })
  notes: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'revoked_at', type: 'varchar', nullable: true })
  revokedAt: string;

  @Column({ name: 'revoked_by', type: 'varchar', nullable: true })
  revokedBy: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'user_id', type: 'varchar' })
  userId: string;

}
