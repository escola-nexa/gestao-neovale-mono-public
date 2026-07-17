import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('chat_channel_labels')
export class ChatChannelLabels {
  @Column({ name: 'color', type: 'varchar' })
  color: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'name', type: 'varchar' })
  name: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

}
