import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('bi_metric_snapshots')
export class BiMetricSnapshots {
  @Column({ name: 'academic_year', type: 'numeric', nullable: true })
  academicYear: number;

  @Column({ name: 'avg_attendance_score', type: 'numeric', nullable: true })
  avgAttendanceScore: number;

  @Column({ name: 'avg_compliance_score', type: 'numeric', nullable: true })
  avgComplianceScore: number;

  @Column({ name: 'avg_grades_score', type: 'numeric', nullable: true })
  avgGradesScore: number;

  @Column({ name: 'avg_planning_score', type: 'numeric', nullable: true })
  avgPlanningScore: number;

  @Column({ name: 'avg_risk_score', type: 'numeric', nullable: true })
  avgRiskScore: number;

  @Column({ name: 'bimester_number', type: 'numeric', nullable: true })
  bimesterNumber: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'scope_id', type: 'varchar', nullable: true })
  scopeId: string;

  @Column({ name: 'scope_name', type: 'varchar', nullable: true })
  scopeName: string;

  @Column({ name: 'scope_type', type: 'varchar' })
  scopeType: string;

  @Column({ name: 'snapshot_date', type: 'varchar' })
  snapshotDate: string;

  @Column({ name: 'teachers_attention', type: 'numeric', nullable: true })
  teachersAttention: number;

  @Column({ name: 'teachers_critical', type: 'numeric', nullable: true })
  teachersCritical: number;

  @Column({ name: 'teachers_excellent', type: 'numeric', nullable: true })
  teachersExcellent: number;

  @Column({ name: 'total_pending', type: 'numeric', nullable: true })
  totalPending: number;

  @Column({ name: 'total_teachers', type: 'numeric', nullable: true })
  totalTeachers: number;

}
