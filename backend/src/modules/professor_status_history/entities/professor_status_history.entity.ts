import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('professor_status_history')
export class ProfessorStatusHistory {
  @Column({ name: 'changed_by_user_email', type: 'varchar', nullable: true })
  changedByUserEmail: string;

  @Column({ name: 'changed_by_user_id', type: 'varchar', nullable: true })
  changedByUserId: string;

  @Column({ name: 'changed_by_user_name', type: 'varchar', nullable: true })
  changedByUserName: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'new_status', type: 'varchar' })
  newStatus: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'previous_status', type: 'varchar', nullable: true })
  previousStatus: string;

  @Column({ name: 'professor_id', type: 'varchar' })
  professorId: string;

  @Column({ name: 'reason', type: 'varchar' })
  reason: string;

}
