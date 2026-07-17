import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('financial_settings_audit')
export class FinancialSettingsAudit {
  @Column({ name: 'action', type: 'varchar' })
  action: string;

  @Column({ name: 'changed_at', type: 'varchar' })
  changedAt: string;

  @Column({ name: 'changed_by', type: 'varchar', nullable: true })
  changedBy: string;

  @Column({ name: 'diff', type: 'jsonb' })
  diff: any;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'justification', type: 'varchar', nullable: true })
  justification: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'settings_id', type: 'varchar', nullable: true })
  settingsId: string;

}
