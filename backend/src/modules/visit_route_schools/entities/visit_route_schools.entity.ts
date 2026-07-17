import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('visit_route_schools')
export class VisitRouteSchools {
  @Column({ name: 'check_in_accuracy_m', type: 'numeric', nullable: true })
  checkInAccuracyM: number;

  @Column({ name: 'check_in_at', type: 'varchar', nullable: true })
  checkInAt: string;

  @Column({ name: 'check_in_lat', type: 'numeric', nullable: true })
  checkInLat: number;

  @Column({ name: 'check_in_lng', type: 'numeric', nullable: true })
  checkInLng: number;

  @Column({ name: 'check_in_photo_path', type: 'varchar', nullable: true })
  checkInPhotoPath: string;

  @Column({ name: 'check_out_accuracy_m', type: 'numeric', nullable: true })
  checkOutAccuracyM: number;

  @Column({ name: 'check_out_at', type: 'varchar', nullable: true })
  checkOutAt: string;

  @Column({ name: 'check_out_lat', type: 'numeric', nullable: true })
  checkOutLat: number;

  @Column({ name: 'check_out_lng', type: 'numeric', nullable: true })
  checkOutLng: number;

  @Column({ name: 'check_out_photo_path', type: 'varchar', nullable: true })
  checkOutPhotoPath: string;

  @Column({ name: 'city', type: 'varchar', nullable: true })
  city: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'day_order', type: 'numeric', nullable: true })
  dayOrder: number;

  @Column({ name: 'distance_from_previous_km', type: 'numeric' })
  distanceFromPreviousKm: number;

  @Column({ name: 'executed_by', type: 'varchar', nullable: true })
  executedBy: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'lat', type: 'numeric', nullable: true })
  lat: number;

  @Column({ name: 'lng', type: 'numeric', nullable: true })
  lng: number;

  @Column({ name: 'notes', type: 'varchar', nullable: true })
  notes: string;

  @Column({ name: 'occurrence_description', type: 'varchar', nullable: true })
  occurrenceDescription: string;

  @Column({ name: 'occurrence_type', type: 'varchar', nullable: true })
  occurrenceType: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'planned_arrival', type: 'varchar', nullable: true })
  plannedArrival: string;

  @Column({ name: 'planned_date', type: 'varchar', nullable: true })
  plannedDate: string;

  @Column({ name: 'planned_departure', type: 'varchar', nullable: true })
  plannedDeparture: string;

  @Column({ name: 'route_id', type: 'varchar' })
  routeId: string;

  @Column({ name: 'route_order', type: 'numeric' })
  routeOrder: number;

  @Column({ name: 'school_id', type: 'varchar' })
  schoolId: string;

  @Column({ name: 'status', type: 'varchar' })
  status: string;

  @Column({ name: 'travel_from_previous_minutes', type: 'numeric' })
  travelFromPreviousMinutes: number;

  @Column({ name: 'uf', type: 'varchar', nullable: true })
  uf: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'visit_minutes', type: 'numeric', nullable: true })
  visitMinutes: number;

}
