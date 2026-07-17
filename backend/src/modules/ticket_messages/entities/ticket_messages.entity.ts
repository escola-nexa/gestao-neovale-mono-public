import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('ticket_messages')
export class TicketMessages {
  @Column({ name: 'attachments', type: 'jsonb', nullable: true })
  attachments: any;

  @Column({ name: 'author_id', type: 'varchar', nullable: true })
  authorId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'edited_at', type: 'varchar', nullable: true })
  editedAt: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'is_internal_note', type: 'boolean' })
  isInternalNote: boolean;

  @Column({ name: 'message', type: 'varchar' })
  message: string;

  @Column({ name: 'parent_message_id', type: 'varchar', nullable: true })
  parentMessageId: string;

  @Column({ name: 'ticket_id', type: 'varchar' })
  ticketId: string;

}
