import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('visit_routes')
export class VisitRoutes {
  @Column({ name: 'break_end', type: 'varchar', nullable: true })
  breakEnd: string;

  @Column({ name: 'break_start', type: 'varchar', nullable: true })
  breakStart: string;

  @Column({ name: 'code', type: 'varchar', nullable: true })
  code: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'created_by', type: 'varchar' })
  createdBy: string;

  @Column({ name: 'default_visit_minutes', type: 'numeric' })
  defaultVisitMinutes: number;

  @Column({ name: 'deleted_at', type: 'varchar', nullable: true })
  deletedAt: string;

  @Column({ name: 'deleted_by', type: 'varchar', nullable: true })
  deletedBy: string;

  @Column({ name: 'deletion_reason', type: 'varchar', nullable: true })
  deletionReason: string;

  @Column({ name: 'departure_point', type: 'varchar', nullable: true })
  departurePoint: string;

  @Column({ name: 'efficiency_score', type: 'varchar', nullable: true })
  efficiencyScore: string;

  @Column({ name: 'end_date', type: 'varchar' })
  endDate: string;

  @Column({ name: 'fuel_cost_per_km', type: 'numeric' })
  fuelCostPerKm: number;

  @Column({ name: 'fuel_price_per_liter', type: 'numeric' })
  fuelPricePerLiter: number;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'kml_per_liter', type: 'numeric' })
  kmlPerLiter: number;

  @Column({ name: 'legacy_visit_id', type: 'varchar', nullable: true })
  legacyVisitId: string;

  @Column({ name: 'name', type: 'varchar' })
  name: string;

  @Column({ name: 'notes', type: 'varchar', nullable: true })
  notes: string;

  @Column({ name: 'optimization_payload', type: 'jsonb', nullable: true })
  optimizationPayload: any;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'shift_end', type: 'varchar' })
  shiftEnd: string;

  @Column({ name: 'shift_start', type: 'varchar' })
  shiftStart: string;

  @Column({ name: 'start_date', type: 'varchar' })
  startDate: string;

  @Column({ name: 'status', type: 'varchar' })
  status: string;

  @Column({ name: 'supervisor_id', type: 'varchar' })
  supervisorId: string;

  @Column({ name: 'toll_estimated', type: 'numeric' })
  tollEstimated: number;

  @Column({ name: 'total_estimated_cost', type: 'numeric' })
  totalEstimatedCost: number;

  @Column({ name: 'total_km', type: 'numeric' })
  totalKm: number;

  @Column({ name: 'total_travel_minutes', type: 'numeric' })
  totalTravelMinutes: number;

  @Column({ name: 'total_visit_minutes', type: 'numeric' })
  totalVisitMinutes: number;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

}
