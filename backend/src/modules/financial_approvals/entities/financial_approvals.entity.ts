import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('financial_approvals')
export class FinancialApprovals {
  @Column({ name: 'action', type: 'varchar' })
  action: string;

  @Column({ name: 'actor_id', type: 'varchar' })
  actorId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'entry_id', type: 'varchar' })
  entryId: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata: any;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'reason', type: 'varchar', nullable: true })
  reason: string;

}
