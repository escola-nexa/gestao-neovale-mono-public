import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('financial_entry_allocations')
export class FinancialEntryAllocations {
  @Column({ name: 'amount', type: 'numeric' })
  amount: number;

  @Column({ name: 'cost_center_id', type: 'varchar', nullable: true })
  costCenterId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'entry_id', type: 'varchar' })
  entryId: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'notes', type: 'varchar', nullable: true })
  notes: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'percentage', type: 'numeric', nullable: true })
  percentage: number;

  @Column({ name: 'project_id', type: 'varchar', nullable: true })
  projectId: string;

  @Column({ name: 'school_id', type: 'varchar', nullable: true })
  schoolId: string;

}
