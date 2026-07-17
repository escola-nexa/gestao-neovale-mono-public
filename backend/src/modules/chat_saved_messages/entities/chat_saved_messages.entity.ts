import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('chat_saved_messages')
export class ChatSavedMessages {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'message_id', type: 'varchar' })
  messageId: string;

  @Column({ name: 'saved_at', type: 'varchar' })
  savedAt: string;

  @Column({ name: 'user_id', type: 'varchar' })
  userId: string;

}
