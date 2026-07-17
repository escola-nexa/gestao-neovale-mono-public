import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('financial_projects')
export class FinancialProjects {
  @Column({ name: 'active', type: 'boolean' })
  active: boolean;

  @Column({ name: 'budget', type: 'numeric', nullable: true })
  budget: number;

  @Column({ name: 'code', type: 'varchar', nullable: true })
  code: string;

  @Column({ name: 'cost_center_id', type: 'varchar', nullable: true })
  costCenterId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'created_by', type: 'varchar', nullable: true })
  createdBy: string;

  @Column({ name: 'customer_id', type: 'varchar', nullable: true })
  customerId: string;

  @Column({ name: 'description', type: 'varchar', nullable: true })
  description: string;

  @Column({ name: 'end_date', type: 'varchar', nullable: true })
  endDate: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'name', type: 'varchar' })
  name: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'responsible_user_id', type: 'varchar', nullable: true })
  responsibleUserId: string;

  @Column({ name: 'school_id', type: 'varchar', nullable: true })
  schoolId: string;

  @Column({ name: 'start_date', type: 'varchar', nullable: true })
  startDate: string;

  @Column({ name: 'status', type: 'varchar' })
  status: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

}
