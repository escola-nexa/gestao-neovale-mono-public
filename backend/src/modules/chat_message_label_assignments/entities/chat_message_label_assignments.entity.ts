import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('chat_message_label_assignments')
export class ChatMessageLabelAssignments {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'applied_by', type: 'varchar', nullable: true })
  appliedBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'label_id', type: 'varchar' })
  labelId: string;

  @Column({ name: 'message_id', type: 'varchar' })
  messageId: string;

}
