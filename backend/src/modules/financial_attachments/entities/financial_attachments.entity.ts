import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('financial_attachments')
export class FinancialAttachments {
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'entry_id', type: 'varchar', nullable: true })
  entryId: string;

  @Column({ name: 'file_name', type: 'varchar' })
  fileName: string;

  @Column({ name: 'file_path', type: 'varchar' })
  filePath: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'installment_id', type: 'varchar', nullable: true })
  installmentId: string;

  @Column({ name: 'kind', type: 'varchar' })
  kind: string;

  @Column({ name: 'mime_type', type: 'varchar', nullable: true })
  mimeType: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'payment_id', type: 'varchar', nullable: true })
  paymentId: string;

  @Column({ name: 'size_bytes', type: 'numeric', nullable: true })
  sizeBytes: number;

  @Column({ name: 'uploaded_by', type: 'varchar' })
  uploadedBy: string;

}
