import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('booklet_delivery_users')
export class BookletDeliveryUsers {
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'delivery_id', type: 'varchar' })
  deliveryId: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'varchar' })
  userId: string;

  @Column({ name: 'user_name', type: 'varchar', nullable: true })
  userName: string;

}
