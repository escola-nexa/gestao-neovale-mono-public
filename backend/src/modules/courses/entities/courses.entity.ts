import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('courses')
export class Courses {
  @Column({ name: 'codigo', type: 'varchar' })
  codigo: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'descricao', type: 'varchar', nullable: true })
  descricao: string;

  @Column({ name: 'formative_track_id', type: 'varchar', nullable: true })
  formativeTrackId: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'nivel_ensino', type: 'varchar' })
  nivelEnsino: string;

  @Column({ name: 'nome', type: 'varchar' })
  nome: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'status', type: 'varchar' })
  status: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

}
