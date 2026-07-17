import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('substitution_payments')
export class SubstitutionPayments {
  @Column({ name: 'amount', type: 'numeric' })
  amount: number;

  @Column({ name: 'approved_at', type: 'varchar', nullable: true })
  approvedAt: string;

  @Column({ name: 'approved_by', type: 'varchar', nullable: true })
  approvedBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'notes', type: 'varchar', nullable: true })
  notes: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'paid_at', type: 'varchar', nullable: true })
  paidAt: string;

  @Column({ name: 'paid_by', type: 'varchar', nullable: true })
  paidBy: string;

  @Column({ name: 'payment_method', type: 'varchar', nullable: true })
  paymentMethod: string;

  @Column({ name: 'proof_document_id', type: 'varchar', nullable: true })
  proofDocumentId: string;

  @Column({ name: 'scheduled_for', type: 'varchar', nullable: true })
  scheduledFor: string;

  @Column({ name: 'status', type: 'varchar' })
  status: string;

  @Column({ name: 'substitution_id', type: 'varchar' })
  substitutionId: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

}
