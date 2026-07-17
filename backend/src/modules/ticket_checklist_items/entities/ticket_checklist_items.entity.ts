import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('ticket_checklist_items')
export class TicketChecklistItems {
  @Column({ name: 'assignee_id', type: 'varchar', nullable: true })
  assigneeId: string;

  @Column({ name: 'checklist_id', type: 'varchar' })
  checklistId: string;

  @Column({ name: 'content', type: 'varchar' })
  content: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'created_by', type: 'varchar', nullable: true })
  createdBy: string;

  @Column({ name: 'done_at', type: 'varchar', nullable: true })
  doneAt: string;

  @Column({ name: 'done_by', type: 'varchar', nullable: true })
  doneBy: string;

  @Column({ name: 'due_date', type: 'varchar', nullable: true })
  dueDate: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'is_done', type: 'boolean' })
  isDone: boolean;

  @Column({ name: 'position', type: 'numeric' })
  position: number;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

}
