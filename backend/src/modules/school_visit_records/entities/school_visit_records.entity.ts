import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('school_visit_records')
export class SchoolVisitRecords {
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'description', type: 'varchar', nullable: true })
  description: string;

  @Column({ name: 'executive_summary', type: 'varchar', nullable: true })
  executiveSummary: string;

  @Column({ name: 'final_notes', type: 'varchar', nullable: true })
  finalNotes: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'next_steps', type: 'varchar', nullable: true })
  nextSteps: string;

  @Column({ name: 'objective', type: 'varchar', nullable: true })
  objective: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'pending_items', type: 'varchar', nullable: true })
  pendingItems: string;

  @Column({ name: 'recorded_by', type: 'varchar' })
  recordedBy: string;

  @Column({ name: 'referrals', type: 'varchar', nullable: true })
  referrals: string;

  @Column({ name: 'title', type: 'varchar' })
  title: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'visit_school_id', type: 'varchar' })
  visitSchoolId: string;

}
