import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('chat_channel_members')
export class ChatChannelMembers {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'archived_at', type: 'varchar', nullable: true })
  archivedAt: string;

  @Column({ name: 'can_post', type: 'boolean' })
  canPost: boolean;

  @Column({ name: 'channel_id', type: 'varchar' })
  channelId: string;

  @Column({ name: 'joined_at', type: 'varchar' })
  joinedAt: string;

  @Column({ name: 'last_read_at', type: 'varchar', nullable: true })
  lastReadAt: string;

  @Column({ name: 'muted_until', type: 'varchar', nullable: true })
  mutedUntil: string;

  @Column({ name: 'pinned_at', type: 'varchar', nullable: true })
  pinnedAt: string;

  @Column({ name: 'role', type: 'varchar' })
  role: string;

  @Column({ name: 'user_id', type: 'varchar' })
  userId: string;

}
