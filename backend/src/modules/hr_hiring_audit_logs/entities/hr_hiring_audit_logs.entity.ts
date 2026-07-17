import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('hr_hiring_audit_logs')
export class HrHiringAuditLogs {
  @Column({ name: 'actor_label', type: 'varchar', nullable: true })
  actorLabel: string;

  @Column({ name: 'actor_user_id', type: 'varchar', nullable: true })
  actorUserId: string;

  @Column({ name: 'candidate_id', type: 'varchar', nullable: true })
  candidateId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'event', type: 'varchar' })
  event: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'payload', type: 'jsonb' })
  payload: any;

  @Column({ name: 'professor_id', type: 'varchar', nullable: true })
  professorId: string;

}
