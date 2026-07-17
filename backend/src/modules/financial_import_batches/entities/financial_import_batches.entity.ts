import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('financial_import_batches')
export class FinancialImportBatches {
  @Column({ name: 'account_id', type: 'varchar' })
  accountId: string;

  @Column({ name: 'completed_at', type: 'varchar', nullable: true })
  completedAt: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'created_by', type: 'varchar', nullable: true })
  createdBy: string;

  @Column({ name: 'duplicate_rows', type: 'numeric', nullable: true })
  duplicateRows: number;

  @Column({ name: 'error_details', type: 'jsonb', nullable: true })
  errorDetails: any;

  @Column({ name: 'failed_rows', type: 'numeric', nullable: true })
  failedRows: number;

  @Column({ name: 'file_format', type: 'varchar' })
  fileFormat: string;

  @Column({ name: 'file_name', type: 'varchar' })
  fileName: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'imported_rows', type: 'numeric', nullable: true })
  importedRows: number;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'period_end', type: 'varchar', nullable: true })
  periodEnd: string;

  @Column({ name: 'period_start', type: 'varchar', nullable: true })
  periodStart: string;

  @Column({ name: 'status', type: 'varchar' })
  status: string;

  @Column({ name: 'storage_path', type: 'varchar', nullable: true })
  storagePath: string;

  @Column({ name: 'total_rows', type: 'numeric', nullable: true })
  totalRows: number;

}
