import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('external_links')
export class ExternalLinks {
  @Column({ name: 'content_type', type: 'varchar' })
  contentType: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'created_by', type: 'varchar' })
  createdBy: string;

  @Column({ name: 'expires_at', type: 'varchar', nullable: true })
  expiresAt: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'is_active', type: 'boolean' })
  isActive: boolean;

  @Column({ name: 'materialized_ano_letivo', type: 'varchar', nullable: true })
  materializedAnoLetivo: string;

  @Column({ name: 'materialized_at', type: 'varchar', nullable: true })
  materializedAt: string;

  @Column({ name: 'materialized_by', type: 'varchar', nullable: true })
  materializedBy: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'school_id', type: 'varchar' })
  schoolId: string;

  @Column({ name: 'scope_json', type: 'jsonb' })
  scopeJson: any;

  @Column({ name: 'starts_at', type: 'varchar' })
  startsAt: string;

  @Column({ name: 'submitted_at', type: 'varchar', nullable: true })
  submittedAt: string;

  @Column({ name: 'token', type: 'varchar' })
  token: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

}
