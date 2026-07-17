import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('booklet_delivery_schools')
export class BookletDeliverySchools {
  @Column({ name: 'city', type: 'varchar', nullable: true })
  city: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'delivery_id', type: 'varchar' })
  deliveryId: string;

  @Column({ name: 'delivery_notes', type: 'varchar', nullable: true })
  deliveryNotes: string;

  @Column({ name: 'delivery_status', type: 'varchar' })
  deliveryStatus: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'received_at', type: 'varchar', nullable: true })
  receivedAt: string;

  @Column({ name: 'receiver_name', type: 'varchar', nullable: true })
  receiverName: string;

  @Column({ name: 'receiver_role', type: 'varchar', nullable: true })
  receiverRole: string;

  @Column({ name: 'route_order', type: 'numeric', nullable: true })
  routeOrder: number;

  @Column({ name: 'school_id', type: 'varchar' })
  schoolId: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

}
