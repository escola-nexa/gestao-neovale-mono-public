import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('financial_cost_centers')
export class FinancialCostCenters {
  @Column({ name: 'active', type: 'boolean' })
  active: boolean;

  @Column({ name: 'allows_allocations', type: 'boolean' })
  allowsAllocations: boolean;

  @Column({ name: 'city_id', type: 'varchar', nullable: true })
  cityId: string;

  @Column({ name: 'code', type: 'varchar', nullable: true })
  code: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'created_by', type: 'varchar', nullable: true })
  createdBy: string;

  @Column({ name: 'description', type: 'varchar', nullable: true })
  description: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'level', type: 'numeric' })
  level: number;

  @Column({ name: 'name', type: 'varchar' })
  name: string;

  @Column({ name: 'notes', type: 'varchar', nullable: true })
  notes: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'parent_id', type: 'varchar', nullable: true })
  parentId: string;

  @Column({ name: 'project_id', type: 'varchar', nullable: true })
  projectId: string;

  @Column({ name: 'responsible_user_id', type: 'varchar', nullable: true })
  responsibleUserId: string;

  @Column({ name: 'school_id', type: 'varchar', nullable: true })
  schoolId: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'valid_from', type: 'varchar', nullable: true })
  validFrom: string;

  @Column({ name: 'valid_until', type: 'varchar', nullable: true })
  validUntil: string;

}
