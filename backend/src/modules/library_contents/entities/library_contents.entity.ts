import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('library_contents')
export class LibraryContents {
  @Column({ name: 'category_id', type: 'varchar' })
  categoryId: string;

  @Column({ name: 'content_type', type: 'varchar' })
  contentType: string;

  @Column({ name: 'content_url', type: 'varchar', nullable: true })
  contentUrl: string;

  @Column({ name: 'course_id', type: 'varchar', nullable: true })
  courseId: string;

  @Column({ name: 'cover_color', type: 'varchar' })
  coverColor: string;

  @Column({ name: 'cover_icon', type: 'varchar' })
  coverIcon: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'created_by', type: 'varchar', nullable: true })
  createdBy: string;

  @Column({ name: 'description', type: 'varchar' })
  description: string;

  @Column({ name: 'file_mime', type: 'varchar', nullable: true })
  fileMime: string;

  @Column({ name: 'file_size', type: 'numeric', nullable: true })
  fileSize: number;

  @Column({ name: 'formative_track_id', type: 'varchar', nullable: true })
  formativeTrackId: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'lesson_number', type: 'numeric', nullable: true })
  lessonNumber: number;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'parent_id', type: 'varchar', nullable: true })
  parentId: string;

  @Column({ name: 'published_at', type: 'varchar', nullable: true })
  publishedAt: string;

  @Column({ name: 'published_by', type: 'varchar', nullable: true })
  publishedBy: string;

  @Column({ name: 'sort_order', type: 'numeric' })
  sortOrder: number;

  @Column({ name: 'storage_path', type: 'varchar', nullable: true })
  storagePath: string;

  @Column({ name: 'subject_id', type: 'varchar', nullable: true })
  subjectId: string;

  @Column({ name: 'title', type: 'varchar' })
  title: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

}
