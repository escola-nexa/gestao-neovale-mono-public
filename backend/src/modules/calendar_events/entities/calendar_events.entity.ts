import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('calendar_events')
export class CalendarEvents {
  @Column({ name: 'calendar_id', type: 'varchar' })
  calendarId: string;

  @Column({ name: 'city', type: 'varchar', nullable: true })
  city: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'description', type: 'varchar', nullable: true })
  description: string;

  @Column({ name: 'event_date', type: 'varchar' })
  eventDate: string;

  @Column({ name: 'event_type', type: 'varchar' })
  eventType: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

}
