import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('chat_message_reactions')
export class ChatMessageReactions {
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'emoji', type: 'varchar' })
  emoji: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'message_id', type: 'varchar' })
  messageId: string;

  @Column({ name: 'user_id', type: 'varchar' })
  userId: string;

}
