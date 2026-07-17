import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('help_tutorials')
export class HelpTutorials {
  @Column({ name: 'audience', type: 'varchar' })
  audience: string;

  @Column({ name: 'category', type: 'varchar' })
  category: string;

  @Column({ name: 'content_type', type: 'varchar' })
  contentType: string;

  @Column({ name: 'content_url', type: 'varchar', nullable: true })
  contentUrl: string;

  @Column({ name: 'cover_color', type: 'varchar' })
  coverColor: string;

  @Column({ name: 'cover_icon', type: 'varchar' })
  coverIcon: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'created_by', type: 'varchar', nullable: true })
  createdBy: string;

  @Column({ name: 'deleted_at', type: 'varchar', nullable: true })
  deletedAt: string;

  @Column({ name: 'description', type: 'varchar' })
  description: string;

  @Column({ name: 'duration_seconds', type: 'numeric', nullable: true })
  durationSeconds: number;

  @Column({ name: 'feature_name', type: 'varchar' })
  featureName: string;

  @Column({ name: 'file_mime', type: 'varchar', nullable: true })
  fileMime: string;

  @Column({ name: 'file_size', type: 'numeric', nullable: true })
  fileSize: number;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'is_featured', type: 'boolean' })
  isFeatured: boolean;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'search_tsv', type: 'varchar' })
  searchTsv: string;

  @Column({ name: 'storage_path', type: 'varchar', nullable: true })
  storagePath: string;

  @Column({ name: 'title', type: 'varchar' })
  title: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'view_count', type: 'numeric' })
  viewCount: number;

}
