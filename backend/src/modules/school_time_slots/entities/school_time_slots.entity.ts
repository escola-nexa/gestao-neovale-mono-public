import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('school_time_slots')
export class SchoolTimeSlots {
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'end_time', type: 'varchar' })
  endTime: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'school_id', type: 'varchar' })
  schoolId: string;

  @Column({ name: 'slot_label', type: 'varchar' })
  slotLabel: string;

  @Column({ name: 'slot_number', type: 'numeric' })
  slotNumber: number;

  @Column({ name: 'start_time', type: 'varchar' })
  startTime: string;

  @Column({ name: 'status', type: 'varchar' })
  status: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'weekday', type: 'varchar' })
  weekday: string;

}
