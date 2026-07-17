import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('import_batch_rows')
export class ImportBatchRows {
  @Column({ name: 'batch_id', type: 'varchar' })
  batchId: string;

  @Column({ name: 'codigo_matricula', type: 'varchar', nullable: true })
  codigoMatricula: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'error_message', type: 'varchar', nullable: true })
  errorMessage: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'row_number', type: 'numeric' })
  rowNumber: number;

  @Column({ name: 'status', type: 'varchar' })
  status: string;

  @Column({ name: 'student_id', type: 'varchar', nullable: true })
  studentId: string;

  @Column({ name: 'student_name', type: 'varchar', nullable: true })
  studentName: string;

}
