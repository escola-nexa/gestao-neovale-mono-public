import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('external_access_logs')
export class ExternalAccessLogs {
  @Column({ name: 'access_status', type: 'varchar' })
  accessStatus: string;

  @Column({ name: 'access_type', type: 'varchar' })
  accessType: string;

  @Column({ name: 'accessed_at', type: 'varchar' })
  accessedAt: string;

  @Column({ name: 'action_performed', type: 'varchar', nullable: true })
  actionPerformed: string;

  @Column({ name: 'city_name', type: 'varchar', nullable: true })
  cityName: string;

  @Column({ name: 'content_type', type: 'varchar', nullable: true })
  contentType: string;

  @Column({ name: 'device_type', type: 'varchar', nullable: true })
  deviceType: string;

  @Column({ name: 'document_origin_id', type: 'varchar', nullable: true })
  documentOriginId: string;

  @Column({ name: 'document_origin_type', type: 'varchar', nullable: true })
  documentOriginType: string;

  @Column({ name: 'document_status_at_access', type: 'varchar', nullable: true })
  documentStatusAtAccess: string;

  @Column({ name: 'external_link_id', type: 'varchar', nullable: true })
  externalLinkId: string;

  @Column({ name: 'failure_reason', type: 'varchar', nullable: true })
  failureReason: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'ip_address', type: 'varchar', nullable: true })
  ipAddress: string;

  @Column({ name: 'keyword_valid', type: 'boolean', nullable: true })
  keywordValid: boolean;

  @Column({ name: 'latitude', type: 'numeric', nullable: true })
  latitude: number;

  @Column({ name: 'longitude', type: 'numeric', nullable: true })
  longitude: number;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'pdf_downloaded', type: 'boolean', nullable: true })
  pdfDownloaded: boolean;

  @Column({ name: 'pdf_viewed', type: 'boolean', nullable: true })
  pdfViewed: boolean;

  @Column({ name: 'school_id', type: 'varchar', nullable: true })
  schoolId: string;

  @Column({ name: 'user_agent', type: 'varchar', nullable: true })
  userAgent: string;

}
