import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('chat_messages')
export class ChatMessages {
  @Column({ name: 'author_id', type: 'varchar' })
  authorId: string;

  @Column({ name: 'body', type: 'varchar', nullable: true })
  body: string;

  @Column({ name: 'channel_id', type: 'varchar' })
  channelId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'deleted_at', type: 'varchar', nullable: true })
  deletedAt: string;

  @Column({ name: 'deleted_by', type: 'varchar', nullable: true })
  deletedBy: string;

  @Column({ name: 'edited_at', type: 'varchar', nullable: true })
  editedAt: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'is_announcement', type: 'boolean' })
  isAnnouncement: boolean;

  @Column({ name: 'is_pinned', type: 'boolean' })
  isPinned: boolean;

  @Column({ name: 'reply_to_id', type: 'varchar', nullable: true })
  replyToId: string;

}
