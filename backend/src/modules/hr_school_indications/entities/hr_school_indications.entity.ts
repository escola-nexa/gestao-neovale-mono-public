import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('hr_school_indications')
export class HrSchoolIndications {
  @Column({ name: 'allocated_at', type: 'varchar', nullable: true })
  allocatedAt: string;

  @Column({ name: 'allocated_by', type: 'varchar', nullable: true })
  allocatedBy: string;

  @Column({ name: 'candidato_disciplinas', type: 'jsonb', nullable: true })
  candidatoDisciplinas: any;

  @Column({ name: 'candidato_email', type: 'varchar', nullable: true })
  candidatoEmail: string;

  @Column({ name: 'candidato_formacao', type: 'varchar', nullable: true })
  candidatoFormacao: string;

  @Column({ name: 'candidato_grade', type: 'jsonb', nullable: true })
  candidatoGrade: any;

  @Column({ name: 'candidato_nome', type: 'varchar' })
  candidatoNome: string;

  @Column({ name: 'candidato_telefone', type: 'varchar', nullable: true })
  candidatoTelefone: string;

  @Column({ name: 'class_group_id', type: 'varchar', nullable: true })
  classGroupId: string;

  @Column({ name: 'course_id', type: 'varchar', nullable: true })
  courseId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'external_link_id', type: 'varchar', nullable: true })
  externalLinkId: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'indicado_por_cargo', type: 'varchar', nullable: true })
  indicadoPorCargo: string;

  @Column({ name: 'indicado_por_email', type: 'varchar', nullable: true })
  indicadoPorEmail: string;

  @Column({ name: 'indicado_por_nome', type: 'varchar' })
  indicadoPorNome: string;

  @Column({ name: 'indication_class_id', type: 'varchar', nullable: true })
  indicationClassId: string;

  @Column({ name: 'motivo_recusa', type: 'varchar', nullable: true })
  motivoRecusa: string;

  @Column({ name: 'observacoes', type: 'varchar', nullable: true })
  observacoes: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'origem', type: 'varchar' })
  origem: string;

  @Column({ name: 'periodo', type: 'varchar', nullable: true })
  periodo: string;

  @Column({ name: 'professor_id', type: 'varchar', nullable: true })
  professorId: string;

  @Column({ name: 'qtd_turmas', type: 'numeric', nullable: true })
  qtdTurmas: number;

  @Column({ name: 'reviewed_at', type: 'varchar', nullable: true })
  reviewedAt: string;

  @Column({ name: 'reviewed_by', type: 'varchar', nullable: true })
  reviewedBy: string;

  @Column({ name: 'school_id', type: 'varchar' })
  schoolId: string;

  @Column({ name: 'status', type: 'varchar' })
  status: string;

  @Column({ name: 'talent_pool_candidate_id', type: 'varchar', nullable: true })
  talentPoolCandidateId: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'weekly_teaching_model_id', type: 'varchar', nullable: true })
  weeklyTeachingModelId: string;

}
