import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('lesson_materials')
export class LessonMaterials {
  @Column({ name: 'bimester_number', type: 'numeric', nullable: true })
  bimesterNumber: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'description', type: 'varchar', nullable: true })
  description: string;

  @Column({ name: 'display_order', type: 'numeric' })
  displayOrder: number;

  @Column({ name: 'file_url', type: 'varchar', nullable: true })
  fileUrl: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'material_type', type: 'varchar' })
  materialType: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'subject_id', type: 'varchar' })
  subjectId: string;

  @Column({ name: 'text_content', type: 'varchar', nullable: true })
  textContent: string;

  @Column({ name: 'title', type: 'varchar' })
  title: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'week_number', type: 'numeric', nullable: true })
  weekNumber: number;

}
