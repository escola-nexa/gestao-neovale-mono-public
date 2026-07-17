import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('professor_document_files')
export class ProfessorDocumentFiles {
  @Column({ name: 'category', type: 'varchar' })
  category: string;

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

  @Column({ name: 'professor_id', type: 'varchar' })
  professorId: string;

  @Column({ name: 'uploaded_at', type: 'varchar' })
  uploadedAt: string;

  @Column({ name: 'uploaded_by', type: 'varchar', nullable: true })
  uploadedBy: string;

}
