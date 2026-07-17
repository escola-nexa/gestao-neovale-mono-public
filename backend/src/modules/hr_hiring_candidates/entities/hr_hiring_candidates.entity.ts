import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('hr_hiring_candidates')
export class HrHiringCandidates {
  @Column({ name: 'cancel_reason', type: 'varchar', nullable: true })
  cancelReason: string;

  @Column({ name: 'cancelled_at', type: 'varchar', nullable: true })
  cancelledAt: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'notes', type: 'varchar', nullable: true })
  notes: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'professor_id', type: 'varchar' })
  professorId: string;

  @Column({ name: 'sent_at', type: 'varchar' })
  sentAt: string;

  @Column({ name: 'sent_by', type: 'varchar', nullable: true })
  sentBy: string;

  @Column({ name: 'status', type: 'varchar' })
  status: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

}
