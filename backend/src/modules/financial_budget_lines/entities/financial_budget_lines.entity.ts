import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('financial_budget_lines')
export class FinancialBudgetLines {
  @Column({ name: 'budget_id', type: 'varchar' })
  budgetId: string;

  @Column({ name: 'category_id', type: 'varchar' })
  categoryId: string;

  @Column({ name: 'cost_center_id', type: 'varchar' })
  costCenterId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'month', type: 'numeric', nullable: true })
  month: number;

  @Column({ name: 'notes', type: 'varchar', nullable: true })
  notes: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'planned_amount', type: 'numeric' })
  plannedAmount: number;

  @Column({ name: 'project_id', type: 'varchar', nullable: true })
  projectId: string;

  @Column({ name: 'school_id', type: 'varchar', nullable: true })
  schoolId: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

}
