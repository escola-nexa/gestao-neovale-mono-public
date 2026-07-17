import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('notifications')
export class Notifications {
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'message', type: 'varchar' })
  message: string;

  @Column({ name: 'read', type: 'boolean' })
  read: boolean;

  @Column({ name: 'reference_id', type: 'varchar', nullable: true })
  referenceId: string;

  @Column({ name: 'title', type: 'varchar' })
  title: string;

  @Column({ name: 'type', type: 'varchar' })
  type: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'user_id', type: 'varchar' })
  userId: string;

}
