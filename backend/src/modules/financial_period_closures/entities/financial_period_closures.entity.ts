import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('financial_period_closures')
export class FinancialPeriodClosures {
  @Column({ name: 'closed_at', type: 'varchar', nullable: true })
  closedAt: string;

  @Column({ name: 'closed_by', type: 'varchar', nullable: true })
  closedBy: string;

  @Column({ name: 'cost_center_id', type: 'varchar', nullable: true })
  costCenterId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'month', type: 'numeric' })
  month: number;

  @Column({ name: 'notes', type: 'varchar', nullable: true })
  notes: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'reopen_reason', type: 'varchar', nullable: true })
  reopenReason: string;

  @Column({ name: 'reopened_at', type: 'varchar', nullable: true })
  reopenedAt: string;

  @Column({ name: 'reopened_by', type: 'varchar', nullable: true })
  reopenedBy: string;

  @Column({ name: 'school_id', type: 'varchar', nullable: true })
  schoolId: string;

  @Column({ name: 'scope', type: 'varchar' })
  scope: string;

  @Column({ name: 'status', type: 'varchar' })
  status: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'year', type: 'numeric' })
  year: number;

}
