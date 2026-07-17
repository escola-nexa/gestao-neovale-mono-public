import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('school_visit_attachments')
export class SchoolVisitAttachments {
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'file_name', type: 'varchar' })
  fileName: string;

  @Column({ name: 'file_size', type: 'numeric', nullable: true })
  fileSize: number;

  @Column({ name: 'file_type', type: 'varchar', nullable: true })
  fileType: string;

  @Column({ name: 'file_url', type: 'varchar' })
  fileUrl: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'uploaded_by', type: 'varchar' })
  uploadedBy: string;

  @Column({ name: 'visit_id', type: 'varchar', nullable: true })
  visitId: string;

  @Column({ name: 'visit_record_id', type: 'varchar', nullable: true })
  visitRecordId: string;

}
