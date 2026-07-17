import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('academic_bimesters')
export class AcademicBimesters {
  @Column({ name: 'calendar_id', type: 'varchar' })
  calendarId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'end_date', type: 'varchar' })
  endDate: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'number', type: 'numeric' })
  number: number;

  @Column({ name: 'start_date', type: 'varchar' })
  startDate: string;

}
