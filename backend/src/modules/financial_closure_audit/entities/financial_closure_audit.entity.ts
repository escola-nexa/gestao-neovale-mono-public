import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('financial_closure_audit')
export class FinancialClosureAudit {
  @Column({ name: 'acted_by', type: 'varchar', nullable: true })
  actedBy: string;

  @Column({ name: 'action', type: 'varchar' })
  action: string;

  @Column({ name: 'closure_id', type: 'varchar' })
  closureId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata: any;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'reason', type: 'varchar', nullable: true })
  reason: string;

}
