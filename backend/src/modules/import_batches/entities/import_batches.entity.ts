import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('import_batches')
export class ImportBatches {
  @Column({ name: 'ano_letivo', type: 'varchar', nullable: true })
  anoLetivo: string;

  @Column({ name: 'class_group_id', type: 'varchar', nullable: true })
  classGroupId: string;

  @Column({ name: 'course_id', type: 'varchar', nullable: true })
  courseId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'dry_run_errors', type: 'jsonb', nullable: true })
  dryRunErrors: any;

  @Column({ name: 'error_count', type: 'numeric' })
  errorCount: number;

  @Column({ name: 'file_name', type: 'varchar' })
  fileName: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'school_id', type: 'varchar', nullable: true })
  schoolId: string;

  @Column({ name: 'status', type: 'varchar' })
  status: string;

  @Column({ name: 'success_count', type: 'numeric' })
  successCount: number;

  @Column({ name: 'total_rows', type: 'numeric' })
  totalRows: number;

  @Column({ name: 'user_id', type: 'varchar' })
  userId: string;

}
