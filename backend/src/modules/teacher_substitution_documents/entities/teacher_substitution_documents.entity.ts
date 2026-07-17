import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('teacher_substitution_documents')
export class TeacherSubstitutionDocuments {
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'document_status', type: 'varchar' })
  documentStatus: string;

  @Column({ name: 'document_type', type: 'varchar' })
  documentType: string;

  @Column({ name: 'file_name', type: 'varchar', nullable: true })
  fileName: string;

  @Column({ name: 'file_size_bytes', type: 'numeric', nullable: true })
  fileSizeBytes: number;

  @Column({ name: 'file_url', type: 'varchar', nullable: true })
  fileUrl: string;

  @Column({ name: 'generated_by', type: 'varchar', nullable: true })
  generatedBy: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'mime_type', type: 'varchar', nullable: true })
  mimeType: string;

  @Column({ name: 'notes', type: 'varchar', nullable: true })
  notes: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'signed_at', type: 'varchar', nullable: true })
  signedAt: string;

  @Column({ name: 'signed_by', type: 'varchar', nullable: true })
  signedBy: string;

  @Column({ name: 'storage_path', type: 'varchar', nullable: true })
  storagePath: string;

  @Column({ name: 'substitution_request_id', type: 'varchar' })
  substitutionRequestId: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'uploaded_by', type: 'varchar', nullable: true })
  uploadedBy: string;

}
