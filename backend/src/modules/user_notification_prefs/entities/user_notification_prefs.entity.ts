import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('user_notification_prefs')
export class UserNotificationPrefs {
  @Column({ name: 'email_enabled', type: 'boolean' })
  emailEnabled: boolean;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'onesignal_subscription_id', type: 'varchar', nullable: true })
  onesignalSubscriptionId: string;

  @Column({ name: 'push_enabled', type: 'boolean' })
  pushEnabled: boolean;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'user_id', type: 'varchar' })
  userId: string;

}
