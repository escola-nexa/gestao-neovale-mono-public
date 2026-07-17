import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('teacher_substitution_candidates')
export class TeacherSubstitutionCandidates {
  @Column({ name: 'candidate_cpf', type: 'varchar', nullable: true })
  candidateCpf: string;

  @Column({ name: 'candidate_email', type: 'varchar', nullable: true })
  candidateEmail: string;

  @Column({ name: 'candidate_name', type: 'varchar' })
  candidateName: string;

  @Column({ name: 'candidate_phone', type: 'varchar', nullable: true })
  candidatePhone: string;

  @Column({ name: 'candidate_rg', type: 'varchar', nullable: true })
  candidateRg: string;

  @Column({ name: 'confirmation_status', type: 'varchar' })
  confirmationStatus: string;

  @Column({ name: 'confirmed_at', type: 'varchar', nullable: true })
  confirmedAt: string;

  @Column({ name: 'confirmed_by', type: 'varchar', nullable: true })
  confirmedBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'notes', type: 'varchar', nullable: true })
  notes: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'professor_id', type: 'varchar', nullable: true })
  professorId: string;

  @Column({ name: 'source', type: 'varchar' })
  source: string;

  @Column({ name: 'substitution_request_id', type: 'varchar' })
  substitutionRequestId: string;

  @Column({ name: 'suggested_at', type: 'varchar' })
  suggestedAt: string;

  @Column({ name: 'suggested_by', type: 'varchar', nullable: true })
  suggestedBy: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

}
