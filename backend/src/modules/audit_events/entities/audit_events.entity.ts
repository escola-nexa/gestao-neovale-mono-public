import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('audit_events')
export class AuditEvents {
  @Column({ name: 'action', type: 'varchar' })
  action: string;

  @Column({ name: 'action_result', type: 'varchar', nullable: true })
  actionResult: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'details', type: 'jsonb', nullable: true })
  details: any;

  @Column({ name: 'device_type', type: 'varchar', nullable: true })
  deviceType: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'ip_address', type: 'varchar', nullable: true })
  ipAddress: string;

  @Column({ name: 'module', type: 'varchar' })
  module: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'school_id', type: 'varchar', nullable: true })
  schoolId: string;

  @Column({ name: 'user_agent', type: 'varchar', nullable: true })
  userAgent: string;

  @Column({ name: 'user_email', type: 'varchar', nullable: true })
  userEmail: string;

  @Column({ name: 'user_id', type: 'varchar' })
  userId: string;

  @Column({ name: 'user_name', type: 'varchar', nullable: true })
  userName: string;

  @Column({ name: 'user_role', type: 'varchar', nullable: true })
  userRole: string;

}
