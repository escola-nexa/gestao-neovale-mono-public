import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('chat_user_inbox_state')
export class ChatUserInboxState {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'last_seen_at', type: 'varchar' })
  lastSeenAt: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'user_id', type: 'varchar' })
  userId: string;

}
