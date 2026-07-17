import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('pwa_settings')
export class PwaSettings {
  @Column({ name: 'background_color', type: 'varchar' })
  backgroundColor: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'description', type: 'varchar' })
  description: string;

  @Column({ name: 'display', type: 'varchar' })
  display: string;

  @Column({ name: 'hidden_menu_items_by_role', type: 'jsonb' })
  hiddenMenuItemsByRole: any;

  @Column({ name: 'hidden_menu_items_mobile', type: 'jsonb' })
  hiddenMenuItemsMobile: any;

  @Column({ name: 'icon_url', type: 'varchar', nullable: true })
  iconUrl: string;

  @Column({ name: 'icons', type: 'jsonb', nullable: true })
  icons: any;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'manifest_id', type: 'varchar' })
  manifestId: string;

  @Column({ name: 'name', type: 'varchar' })
  name: string;

  @Column({ name: 'orientation', type: 'varchar' })
  orientation: string;

  @Column({ name: 'screenshots', type: 'jsonb' })
  screenshots: any;

  @Column({ name: 'short_name', type: 'varchar' })
  shortName: string;

  @Column({ name: 'shortcuts', type: 'jsonb' })
  shortcuts: any;

  @Column({ name: 'singleton', type: 'boolean' })
  singleton: boolean;

  @Column({ name: 'start_url_by_role', type: 'jsonb' })
  startUrlByRole: any;

  @Column({ name: 'start_url_default', type: 'varchar' })
  startUrlDefault: string;

  @Column({ name: 'theme_color', type: 'varchar' })
  themeColor: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

}
