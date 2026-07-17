import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('professor_medical_reports')
export class ProfessorMedicalReports {
  @Column({ name: 'cid_code', type: 'varchar' })
  cidCode: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'description', type: 'varchar', nullable: true })
  description: string;

  @Column({ name: 'file_name', type: 'varchar', nullable: true })
  fileName: string;

  @Column({ name: 'file_path', type: 'varchar', nullable: true })
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

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'uploaded_by', type: 'varchar', nullable: true })
  uploadedBy: string;

}
