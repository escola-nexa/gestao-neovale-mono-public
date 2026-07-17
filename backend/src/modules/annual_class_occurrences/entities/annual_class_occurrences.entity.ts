import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('annual_class_occurrences')
export class AnnualClassOccurrences {
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'end_time', type: 'varchar' })
  endTime: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'observation', type: 'varchar', nullable: true })
  observation: string;

  @Column({ name: 'occurrence_date', type: 'varchar' })
  occurrenceDate: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'start_time', type: 'varchar' })
  startTime: string;

  @Column({ name: 'status', type: 'varchar' })
  status: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'weekly_model_id', type: 'varchar' })
  weeklyModelId: string;

}
