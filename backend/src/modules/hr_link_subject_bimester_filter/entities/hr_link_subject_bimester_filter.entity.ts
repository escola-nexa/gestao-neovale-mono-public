import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('hr_link_subject_bimester_filter')
export class HrLinkSubjectBimesterFilter {
  @Column({ name: 'bimester', type: 'numeric' })
  bimester: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'enabled', type: 'boolean' })
  enabled: boolean;

  @Column({ name: 'external_link_id', type: 'varchar' })
  externalLinkId: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'subject_id', type: 'varchar' })
  subjectId: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

}
