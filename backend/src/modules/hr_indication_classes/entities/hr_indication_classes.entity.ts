import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('hr_indication_classes')
export class HrIndicationClasses {
  @Column({ name: 'course_id', type: 'varchar' })
  courseId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'external_link_id', type: 'varchar', nullable: true })
  externalLinkId: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'nome', type: 'varchar' })
  nome: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'qtd_professores_indicados', type: 'numeric' })
  qtdProfessoresIndicados: number;

  @Column({ name: 'school_id', type: 'varchar' })
  schoolId: string;

  @Column({ name: 'turno', type: 'varchar' })
  turno: string;

}
