import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('financial_document_types')
export class FinancialDocumentTypes {
  @Column({ name: 'active', type: 'boolean' })
  active: boolean;

  @Column({ name: 'allows_duplicate_number', type: 'boolean' })
  allowsDuplicateNumber: boolean;

  @Column({ name: 'code', type: 'varchar', nullable: true })
  code: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'direction', type: 'varchar' })
  direction: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'is_system', type: 'boolean' })
  isSystem: boolean;

  @Column({ name: 'name', type: 'varchar' })
  name: string;

  @Column({ name: 'notes', type: 'varchar', nullable: true })
  notes: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'requires_attachment', type: 'boolean' })
  requiresAttachment: boolean;

  @Column({ name: 'requires_issue_date', type: 'boolean' })
  requiresIssueDate: boolean;

  @Column({ name: 'requires_number', type: 'boolean' })
  requiresNumber: boolean;

  @Column({ name: 'retention_days', type: 'numeric' })
  retentionDays: number;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

}
