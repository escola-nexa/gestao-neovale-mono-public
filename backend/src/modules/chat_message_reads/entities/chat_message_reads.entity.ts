import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('chat_message_reads')
export class ChatMessageReads {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'message_id', type: 'varchar' })
  messageId: string;

  @Column({ name: 'read_at', type: 'varchar' })
  readAt: string;

  @Column({ name: 'user_id', type: 'varchar' })
  userId: string;

}
