import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('branding_settings')
export class BrandingSettings {
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'display_name', type: 'varchar' })
  displayName: string;

  @Column({ name: 'icon_url', type: 'varchar', nullable: true })
  iconUrl: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'logo_url', type: 'varchar', nullable: true })
  logoUrl: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'subtitle', type: 'varchar' })
  subtitle: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

}
