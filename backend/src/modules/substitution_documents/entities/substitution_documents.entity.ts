import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('substitution_documents')
export class SubstitutionDocuments {
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'doc_type', type: 'varchar' })
  docType: string;

  @Column({ name: 'file_name', type: 'varchar' })
  fileName: string;

  @Column({ name: 'file_path', type: 'varchar' })
  filePath: string;

  @Column({ name: 'file_size', type: 'numeric', nullable: true })
  fileSize: number;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'mime_type', type: 'varchar', nullable: true })
  mimeType: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'substitution_id', type: 'varchar' })
  substitutionId: string;

  @Column({ name: 'uploaded_by', type: 'varchar' })
  uploadedBy: string;

}
