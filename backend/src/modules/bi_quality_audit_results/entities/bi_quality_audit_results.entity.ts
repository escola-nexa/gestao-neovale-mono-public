import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('bi_quality_audit_results')
export class BiQualityAuditResults {
  @Column({ name: 'audit_type', type: 'varchar' })
  auditType: string;

  @Column({ name: 'checked_at', type: 'varchar', nullable: true })
  checkedAt: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'issue_description', type: 'varchar', nullable: true })
  issueDescription: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'route', type: 'varchar' })
  route: string;

  @Column({ name: 'screen_name', type: 'varchar' })
  screenName: string;

  @Column({ name: 'severity', type: 'varchar', nullable: true })
  severity: string;

  @Column({ name: 'status', type: 'varchar' })
  status: string;

}
