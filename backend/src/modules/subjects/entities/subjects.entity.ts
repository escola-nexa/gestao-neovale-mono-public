import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('subjects')
export class Subjects {
  @Column({ name: 'carga_horaria_semanal', type: 'numeric' })
  cargaHorariaSemanal: number;

  @Column({ name: 'codigo', type: 'varchar' })
  codigo: string;

  @Column({ name: 'course_id', type: 'varchar' })
  courseId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'deleted_at', type: 'varchar', nullable: true })
  deletedAt: string;

  @Column({ name: 'descricao', type: 'varchar', nullable: true })
  descricao: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'nome', type: 'varchar' })
  nome: string;

  @Column({ name: 'nome_boletim', type: 'varchar', nullable: true })
  nomeBoletim: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'semester', type: 'varchar' })
  semester: string;

  @Column({ name: 'status', type: 'varchar' })
  status: string;

  @Column({ name: 'total_classes', type: 'numeric' })
  totalClasses: number;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

}
