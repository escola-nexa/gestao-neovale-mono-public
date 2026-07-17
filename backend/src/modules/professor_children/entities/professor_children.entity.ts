import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('professor_children')
export class ProfessorChildren {
  @Column({ name: 'birth_date', type: 'varchar', nullable: true })
  birthDate: string;

  @Column({ name: 'city', type: 'varchar', nullable: true })
  city: string;

  @Column({ name: 'cpf', type: 'varchar', nullable: true })
  cpf: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'name', type: 'varchar' })
  name: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'professor_id', type: 'varchar' })
  professorId: string;

  @Column({ name: 'state', type: 'varchar', nullable: true })
  state: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

}
