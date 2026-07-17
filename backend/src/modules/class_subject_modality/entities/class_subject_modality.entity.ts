import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('class_subject_modality')
export class ClassSubjectModality {
  @Column({ name: 'ch_anp', type: 'numeric' })
  chAnp: number;

  @Column({ name: 'ch_presencial', type: 'numeric' })
  chPresencial: number;

  @Column({ name: 'class_group_id', type: 'varchar' })
  classGroupId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'semester', type: 'varchar' })
  semester: string;

  @Column({ name: 'subject_id', type: 'varchar' })
  subjectId: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

}
