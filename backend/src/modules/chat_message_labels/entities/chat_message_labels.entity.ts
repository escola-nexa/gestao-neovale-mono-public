import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('chat_message_labels')
export class ChatMessageLabels {
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
