import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('teacher_substitution_status_history')
export class TeacherSubstitutionStatusHistory {
  @Column({ name: 'changed_by', type: 'varchar', nullable: true })
  changedBy: string;

  @Column({ name: 'changed_by_role', type: 'varchar', nullable: true })
  changedByRole: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'metadata', type: 'jsonb' })
  metadata: any;

  @Column({ name: 'new_payment_status', type: 'varchar', nullable: true })
  newPaymentStatus: string;

  @Column({ name: 'new_status', type: 'varchar' })
  newStatus: string;

  @Column({ name: 'old_payment_status', type: 'varchar', nullable: true })
  oldPaymentStatus: string;

  @Column({ name: 'old_status', type: 'varchar', nullable: true })
  oldStatus: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'reason', type: 'varchar', nullable: true })
  reason: string;

  @Column({ name: 'substitution_request_id', type: 'varchar' })
  substitutionRequestId: string;

}
