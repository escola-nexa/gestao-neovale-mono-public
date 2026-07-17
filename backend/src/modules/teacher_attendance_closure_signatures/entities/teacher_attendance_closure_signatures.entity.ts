import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('teacher_attendance_closure_signatures')
export class TeacherAttendanceClosureSignatures {
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'ip_address', type: 'varchar' })
  ipAddress: string;

  @Column({ name: 'monthly_sheet_id', type: 'varchar' })
  monthlySheetId: string;

  @Column({ name: 'notes', type: 'varchar', nullable: true })
  notes: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'signature_status', type: 'varchar' })
  signatureStatus: string;

  @Column({ name: 'signature_type', type: 'varchar' })
  signatureType: string;

  @Column({ name: 'signed_at', type: 'varchar' })
  signedAt: string;

  @Column({ name: 'signed_by', type: 'varchar' })
  signedBy: string;

  @Column({ name: 'signed_by_role', type: 'varchar' })
  signedByRole: string;

  @Column({ name: 'user_agent', type: 'varchar', nullable: true })
  userAgent: string;

}
