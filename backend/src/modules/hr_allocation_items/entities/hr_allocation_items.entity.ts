import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('hr_allocation_items')
export class HrAllocationItems {
  @Column({ name: 'aulas', type: 'numeric' })
  aulas: number;

  @Column({ name: 'class_group_id', type: 'varchar' })
  classGroupId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'indicado_por_external_link_id', type: 'varchar', nullable: true })
  indicadoPorExternalLinkId: string;

  @Column({ name: 'indicado_por_nome', type: 'varchar', nullable: true })
  indicadoPorNome: string;

  @Column({ name: 'motivo_recusa', type: 'varchar', nullable: true })
  motivoRecusa: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'origem', type: 'varchar' })
  origem: string;

  @Column({ name: 'plan_id', type: 'varchar' })
  planId: string;

  @Column({ name: 'professor_id', type: 'varchar', nullable: true })
  professorId: string;

  @Column({ name: 'school_time_slot_id', type: 'varchar', nullable: true })
  schoolTimeSlotId: string;

  @Column({ name: 'status', type: 'varchar' })
  status: string;

  @Column({ name: 'subject_id', type: 'varchar' })
  subjectId: string;

  @Column({ name: 'ucp_type', type: 'varchar' })
  ucpType: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'vaga_label', type: 'varchar', nullable: true })
  vagaLabel: string;

  @Column({ name: 'weekday', type: 'varchar', nullable: true })
  weekday: string;

  @Column({ name: 'weekly_teaching_model_id', type: 'varchar', nullable: true })
  weeklyTeachingModelId: string;

}
