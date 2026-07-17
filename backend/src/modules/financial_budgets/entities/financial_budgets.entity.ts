import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('financial_budgets')
export class FinancialBudgets {
  @Column({ name: 'alert_threshold_percent', type: 'numeric' })
  alertThresholdPercent: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'created_by', type: 'varchar', nullable: true })
  createdBy: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'month', type: 'numeric', nullable: true })
  month: number;

  @Column({ name: 'name', type: 'varchar' })
  name: string;

  @Column({ name: 'notes', type: 'varchar', nullable: true })
  notes: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'overrun_mode', type: 'varchar' })
  overrunMode: string;

  @Column({ name: 'status', type: 'varchar' })
  status: string;

  @Column({ name: 'total_planned', type: 'numeric' })
  totalPlanned: number;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'year', type: 'numeric' })
  year: number;

}
