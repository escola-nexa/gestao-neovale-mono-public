import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('booklet_delivery_items')
export class BookletDeliveryItems {
  @Column({ name: 'booklet_name', type: 'varchar' })
  bookletName: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'delivery_school_id', type: 'varchar' })
  deliverySchoolId: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'notes', type: 'varchar', nullable: true })
  notes: string;

  @Column({ name: 'quantity_delivered', type: 'numeric' })
  quantityDelivered: number;

  @Column({ name: 'quantity_expected', type: 'numeric' })
  quantityExpected: number;

  @Column({ name: 'unit', type: 'varchar', nullable: true })
  unit: string;

}
