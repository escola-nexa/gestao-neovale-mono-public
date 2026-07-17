import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('teacher_substitution_payments')
export class TeacherSubstitutionPayments {
  @Column({ name: 'approved_at', type: 'varchar', nullable: true })
  approvedAt: string;

  @Column({ name: 'approved_by', type: 'varchar', nullable: true })
  approvedBy: string;

  @Column({ name: 'bank_data', type: 'jsonb' })
  bankData: any;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'discount_amount', type: 'numeric' })
  discountAmount: number;

  @Column({ name: 'financial_entry_id', type: 'varchar', nullable: true })
  financialEntryId: string;

  @Column({ name: 'gross_amount', type: 'numeric' })
  grossAmount: number;

  @Column({ name: 'hour_class_value', type: 'numeric' })
  hourClassValue: number;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'net_amount', type: 'numeric' })
  netAmount: number;

  @Column({ name: 'notes', type: 'varchar', nullable: true })
  notes: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'paid_at', type: 'varchar', nullable: true })
  paidAt: string;

  @Column({ name: 'paid_by', type: 'varchar', nullable: true })
  paidBy: string;

  @Column({ name: 'payee_cpf', type: 'varchar', nullable: true })
  payeeCpf: string;

  @Column({ name: 'payee_name', type: 'varchar' })
  payeeName: string;

  @Column({ name: 'payment_method', type: 'varchar', nullable: true })
  paymentMethod: string;

  @Column({ name: 'payment_proof_document_id', type: 'varchar', nullable: true })
  paymentProofDocumentId: string;

  @Column({ name: 'payment_reference', type: 'varchar', nullable: true })
  paymentReference: string;

  @Column({ name: 'payment_status', type: 'varchar' })
  paymentStatus: string;

  @Column({ name: 'scheduled_for', type: 'varchar', nullable: true })
  scheduledFor: string;

  @Column({ name: 'substitute_professor_id', type: 'varchar', nullable: true })
  substituteProfessorId: string;

  @Column({ name: 'substitution_request_id', type: 'varchar' })
  substitutionRequestId: string;

  @Column({ name: 'total_class_hours', type: 'numeric' })
  totalClassHours: number;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

}
