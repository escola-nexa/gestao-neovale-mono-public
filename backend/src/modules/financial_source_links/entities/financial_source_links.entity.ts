import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('financial_source_links')
export class FinancialSourceLinks {
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

  @Column({ name: 'source_id', type: 'varchar' })
  sourceId: string;

  @Column({ name: 'source_kind', type: 'varchar' })
  sourceKind: string;

}
