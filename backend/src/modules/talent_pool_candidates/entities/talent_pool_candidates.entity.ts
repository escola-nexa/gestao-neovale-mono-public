import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('talent_pool_candidates')
export class TalentPoolCandidates {
  @Column({ name: 'city_id', type: 'varchar', nullable: true })
  cityId: string;

  @Column({ name: 'classification', type: 'varchar', nullable: true })
  classification: string;

  @Column({ name: 'classifications', type: 'jsonb' })
  classifications: any;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'created_by', type: 'varchar', nullable: true })
  createdBy: string;

  @Column({ name: 'deleted_at', type: 'varchar', nullable: true })
  deletedAt: string;

  @Column({ name: 'email', type: 'varchar', nullable: true })
  email: string;

  @Column({ name: 'formation_area', type: 'varchar', nullable: true })
  formationArea: string;

  @Column({ name: 'free_periods', type: 'varchar' })
  freePeriods: string;

  @Column({ name: 'free_weekdays', type: 'varchar' })
  freeWeekdays: string;

  @Column({ name: 'full_name', type: 'varchar' })
  fullName: string;

  @Column({ name: 'graduate_path', type: 'varchar', nullable: true })
  graduatePath: string;

  @Column({ name: 'has_licentiate', type: 'boolean' })
  hasLicentiate: boolean;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'notes', type: 'varchar', nullable: true })
  notes: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'phone', type: 'varchar' })
  phone: string;

  @Column({ name: 'phone_is_whatsapp', type: 'boolean' })
  phoneIsWhatsapp: boolean;

  @Column({ name: 'pix', type: 'varchar', nullable: true })
  pix: string;

  @Column({ name: 'resume_path', type: 'varchar', nullable: true })
  resumePath: string;

  @Column({ name: 'schooling_path', type: 'varchar', nullable: true })
  schoolingPath: string;

  @Column({ name: 'state_id', type: 'varchar', nullable: true })
  stateId: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

}
