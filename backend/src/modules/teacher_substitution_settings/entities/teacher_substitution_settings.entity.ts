import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('teacher_substitution_settings')
export class TeacherSubstitutionSettings {
  @Column({ name: 'allow_external_substitute', type: 'boolean' })
  allowExternalSubstitute: boolean;

  @Column({ name: 'allow_professor_upload_report', type: 'boolean' })
  allowProfessorUploadReport: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'default_financial_account_id', type: 'varchar', nullable: true })
  defaultFinancialAccountId: string;

  @Column({ name: 'default_financial_category_id', type: 'varchar', nullable: true })
  defaultFinancialCategoryId: string;

  @Column({ name: 'default_financial_cost_center_id', type: 'varchar', nullable: true })
  defaultFinancialCostCenterId: string;

  @Column({ name: 'default_financial_payment_method_id', type: 'varchar', nullable: true })
  defaultFinancialPaymentMethodId: string;

  @Column({ name: 'default_hour_class_value', type: 'numeric' })
  defaultHourClassValue: number;

  @Column({ name: 'enabled', type: 'boolean' })
  enabled: boolean;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'payment_approval_required', type: 'boolean' })
  paymentApprovalRequired: boolean;

  @Column({ name: 'require_channel_notification', type: 'boolean' })
  requireChannelNotification: boolean;

  @Column({ name: 'require_receipt_for_payment', type: 'boolean' })
  requireReceiptForPayment: boolean;

  @Column({ name: 'require_signed_report_for_payment', type: 'boolean' })
  requireSignedReportForPayment: boolean;

  @Column({ name: 'require_ticket_creation', type: 'boolean' })
  requireTicketCreation: boolean;

  @Column({ name: 'substitution_channel_name', type: 'varchar' })
  substitutionChannelName: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'use_financial_module', type: 'boolean' })
  useFinancialModule: boolean;

}
