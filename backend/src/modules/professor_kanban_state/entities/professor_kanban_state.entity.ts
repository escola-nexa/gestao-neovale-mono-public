import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('professor_kanban_state')
export class ProfessorKanbanState {
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'description', type: 'varchar', nullable: true })
  description: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'labels', type: 'jsonb' })
  labels: any;

  @Column({ name: 'last_moved_at', type: 'varchar', nullable: true })
  lastMovedAt: string;

  @Column({ name: 'last_moved_by', type: 'varchar', nullable: true })
  lastMovedBy: string;

  @Column({ name: 'manual_column', type: 'varchar', nullable: true })
  manualColumn: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'professor_id', type: 'varchar' })
  professorId: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

}
