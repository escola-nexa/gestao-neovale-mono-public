import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('pwa_pushed_notifications')
export class PwaPushedNotifications {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'notification_id', type: 'varchar' })
  notificationId: string;

  @Column({ name: 'pushed_at', type: 'varchar' })
  pushedAt: string;

}
