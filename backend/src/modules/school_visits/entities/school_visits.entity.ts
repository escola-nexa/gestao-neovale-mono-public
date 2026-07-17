import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('school_visits')
export class SchoolVisits {
  @Column({ name: 'action_name', type: 'varchar' })
  actionName: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'created_by', type: 'varchar' })
  createdBy: string;

  @Column({ name: 'daily_end_time', type: 'varchar', nullable: true })
  dailyEndTime: string;

  @Column({ name: 'daily_start_time', type: 'varchar', nullable: true })
  dailyStartTime: string;

  @Column({ name: 'deleted_at', type: 'varchar', nullable: true })
  deletedAt: string;

  @Column({ name: 'deleted_by', type: 'varchar', nullable: true })
  deletedBy: string;

  @Column({ name: 'deletion_reason', type: 'varchar', nullable: true })
  deletionReason: string;

  @Column({ name: 'departure_point', type: 'varchar', nullable: true })
  departurePoint: string;

  @Column({ name: 'description', type: 'varchar', nullable: true })
  description: string;

  @Column({ name: 'end_datetime', type: 'varchar', nullable: true })
  endDatetime: string;

  @Column({ name: 'form_pdf_url', type: 'varchar', nullable: true })
  formPdfUrl: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'interval_minutes', type: 'numeric', nullable: true })
  intervalMinutes: number;

  @Column({ name: 'logistics_notes', type: 'varchar', nullable: true })
  logisticsNotes: string;

  @Column({ name: 'objective', type: 'varchar', nullable: true })
  objective: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'priority', type: 'varchar' })
  priority: string;

  @Column({ name: 'responsible_user_id', type: 'varchar' })
  responsibleUserId: string;

  @Column({ name: 'start_datetime', type: 'varchar' })
  startDatetime: string;

  @Column({ name: 'status', type: 'varchar' })
  status: string;

  @Column({ name: 'travel_time_minutes', type: 'numeric', nullable: true })
  travelTimeMinutes: number;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'visit_duration_minutes', type: 'numeric', nullable: true })
  visitDurationMinutes: number;

  @Column({ name: 'visit_type', type: 'varchar' })
  visitType: string;

  @Column({ name: 'weekly_schedule', type: 'jsonb', nullable: true })
  weeklySchedule: any;

}
