import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('school_visit_participants')
export class SchoolVisitParticipants {
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'name', type: 'varchar' })
  name: string;

  @Column({ name: 'notes', type: 'varchar', nullable: true })
  notes: string;

  @Column({ name: 'role', type: 'varchar', nullable: true })
  role: string;

  @Column({ name: 'school_link', type: 'varchar', nullable: true })
  schoolLink: string;

  @Column({ name: 'visit_record_id', type: 'varchar' })
  visitRecordId: string;

}
