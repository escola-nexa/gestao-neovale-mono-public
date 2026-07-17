import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('school_visit_schools')
export class SchoolVisitSchools {
  @Column({ name: 'arrival_at', type: 'varchar', nullable: true })
  arrivalAt: string;

  @Column({ name: 'city', type: 'varchar', nullable: true })
  city: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'day_order', type: 'numeric', nullable: true })
  dayOrder: number;

  @Column({ name: 'departure_at', type: 'varchar', nullable: true })
  departureAt: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'planned_arrival', type: 'varchar', nullable: true })
  plannedArrival: string;

  @Column({ name: 'planned_date', type: 'varchar', nullable: true })
  plannedDate: string;

  @Column({ name: 'planned_departure', type: 'varchar', nullable: true })
  plannedDeparture: string;

  @Column({ name: 'route_order', type: 'numeric', nullable: true })
  routeOrder: number;

  @Column({ name: 'school_id', type: 'varchar' })
  schoolId: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'visit_id', type: 'varchar' })
  visitId: string;

  @Column({ name: 'visit_status', type: 'varchar' })
  visitStatus: string;

}
