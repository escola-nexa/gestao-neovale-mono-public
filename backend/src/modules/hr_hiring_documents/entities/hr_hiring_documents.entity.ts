import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('hr_hiring_documents')
export class HrHiringDocuments {
  @Column({ name: 'candidate_id', type: 'varchar' })
  candidateId: string;

  @Column({ name: 'deleted_at', type: 'varchar', nullable: true })
  deletedAt: string;

  @Column({ name: 'doc_kind', type: 'varchar' })
  docKind: string;

  @Column({ name: 'external_geo', type: 'varchar', nullable: true })
  externalGeo: string;

  @Column({ name: 'external_ip', type: 'varchar', nullable: true })
  externalIp: string;

  @Column({ name: 'external_link_id', type: 'varchar', nullable: true })
  externalLinkId: string;

  @Column({ name: 'file_name', type: 'varchar' })
  fileName: string;

  @Column({ name: 'file_path', type: 'varchar' })
  filePath: string;

  @Column({ name: 'file_size', type: 'numeric', nullable: true })
  fileSize: number;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'kind', type: 'varchar' })
  kind: string;

  @Column({ name: 'mime_type', type: 'varchar', nullable: true })
  mimeType: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'parent_document_id', type: 'varchar', nullable: true })
  parentDocumentId: string;

  @Column({ name: 'professor_id', type: 'varchar' })
  professorId: string;

  @Column({ name: 'title', type: 'varchar' })
  title: string;

  @Column({ name: 'uploaded_at', type: 'varchar' })
  uploadedAt: string;

  @Column({ name: 'uploaded_by', type: 'varchar', nullable: true })
  uploadedBy: string;

  @Column({ name: 'version', type: 'numeric' })
  version: number;

}
