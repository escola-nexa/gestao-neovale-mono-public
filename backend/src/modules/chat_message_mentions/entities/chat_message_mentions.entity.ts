import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('chat_message_mentions')
export class ChatMessageMentions {
  @Column({ name: 'author_id', type: 'varchar' })
  authorId: string;

  @Column({ name: 'channel_id', type: 'varchar' })
  channelId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'mentioned_user_id', type: 'varchar' })
  mentionedUserId: string;

  @Column({ name: 'message_id', type: 'varchar' })
  messageId: string;

}
