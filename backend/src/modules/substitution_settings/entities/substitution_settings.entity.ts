import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('substitution_settings')
export class SubstitutionSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'auto_create_ticket', type: 'boolean' })
  autoCreateTicket: boolean;

  @Column({ name: 'default_hourly_rate', type: 'numeric' })
  defaultHourlyRate: number;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'require_rh_approval', type: 'boolean' })
  requireRhApproval: boolean;

  @Column({ name: 'require_signed_report', type: 'boolean' })
  requireSignedReport: boolean;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'updated_by', type: 'varchar', nullable: true })
  updatedBy: string;

}
