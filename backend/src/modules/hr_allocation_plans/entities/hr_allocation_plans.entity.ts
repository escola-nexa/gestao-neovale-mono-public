import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('hr_allocation_plans')
export class HrAllocationPlans {
  @Column({ name: 'ano_letivo', type: 'varchar' })
  anoLetivo: string;

  @Column({ name: 'course_id', type: 'varchar' })
  courseId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'created_by', type: 'varchar', nullable: true })
  createdBy: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'notes', type: 'varchar', nullable: true })
  notes: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'periodo', type: 'varchar' })
  periodo: string;

  @Column({ name: 'published_at', type: 'varchar', nullable: true })
  publishedAt: string;

  @Column({ name: 'published_by', type: 'varchar', nullable: true })
  publishedBy: string;

  @Column({ name: 'qtd_turmas', type: 'numeric' })
  qtdTurmas: number;

  @Column({ name: 'school_id', type: 'varchar' })
  schoolId: string;

  @Column({ name: 'status', type: 'varchar' })
  status: string;

  @Column({ name: 'teto_ch_semanal', type: 'numeric' })
  tetoChSemanal: number;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

}
