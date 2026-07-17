import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('folha_ponto_generated_log')
export class FolhaPontoGeneratedLog {
  @Column({ name: 'generated_at', type: 'varchar' })
  generatedAt: string;

  @Column({ name: 'generated_by', type: 'varchar', nullable: true })
  generatedBy: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'month', type: 'numeric' })
  month: number;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'professor_id', type: 'varchar' })
  professorId: string;

  @Column({ name: 'school_id', type: 'varchar' })
  schoolId: string;

  @Column({ name: 'signature', type: 'varchar' })
  signature: string;

  @Column({ name: 'turno', type: 'varchar' })
  turno: string;

  @Column({ name: 'year', type: 'numeric' })
  year: number;

}
