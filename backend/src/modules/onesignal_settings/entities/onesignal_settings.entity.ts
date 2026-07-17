import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('onesignal_settings')
export class OnesignalSettings {
  @Column({ name: 'app_id', type: 'varchar', nullable: true })
  appId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'email_enabled', type: 'boolean' })
  emailEnabled: boolean;

  @Column({ name: 'email_from_address', type: 'varchar', nullable: true })
  emailFromAddress: string;

  @Column({ name: 'email_from_name', type: 'varchar', nullable: true })
  emailFromName: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'push_enabled', type: 'boolean' })
  pushEnabled: boolean;

  @Column({ name: 'rest_api_key', type: 'varchar', nullable: true })
  restApiKey: string;

  @Column({ name: 'safari_web_id', type: 'varchar', nullable: true })
  safariWebId: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

}
