import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('financial_settings')
export class FinancialSettings {
  @Column({ name: 'accounting_basis', type: 'varchar' })
  accountingBasis: string;

  @Column({ name: 'allow_negative_bank_balance', type: 'boolean' })
  allowNegativeBankBalance: boolean;

  @Column({ name: 'allow_partial_payment', type: 'boolean' })
  allowPartialPayment: boolean;

  @Column({ name: 'allow_physical_delete', type: 'boolean' })
  allowPhysicalDelete: boolean;

  @Column({ name: 'allowed_import_formats', type: 'jsonb' })
  allowedImportFormats: any;

  @Column({ name: 'approval_required_above', type: 'numeric', nullable: true })
  approvalRequiredAbove: number;

  @Column({ name: 'auto_number_entries', type: 'boolean' })
  autoNumberEntries: boolean;

  @Column({ name: 'batch_prefix', type: 'varchar' })
  batchPrefix: string;

  @Column({ name: 'budget_exceed_action', type: 'varchar' })
  budgetExceedAction: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'default_account_id', type: 'varchar', nullable: true })
  defaultAccountId: string;

  @Column({ name: 'default_cost_center_id', type: 'varchar', nullable: true })
  defaultCostCenterId: string;

  @Column({ name: 'default_currency', type: 'varchar' })
  defaultCurrency: string;

  @Column({ name: 'default_daily_interest_percent', type: 'numeric' })
  defaultDailyInterestPercent: number;

  @Column({ name: 'default_early_discount_days', type: 'numeric' })
  defaultEarlyDiscountDays: number;

  @Column({ name: 'default_early_discount_percent', type: 'numeric' })
  defaultEarlyDiscountPercent: number;

  @Column({ name: 'default_late_fee_percent', type: 'numeric' })
  defaultLateFeePercent: number;

  @Column({ name: 'default_payment_method_id', type: 'varchar', nullable: true })
  defaultPaymentMethodId: string;

  @Column({ name: 'default_route_category_id', type: 'varchar', nullable: true })
  defaultRouteCategoryId: string;

  @Column({ name: 'default_substitution_category_id', type: 'varchar', nullable: true })
  defaultSubstitutionCategoryId: string;

  @Column({ name: 'enable_budget_control', type: 'boolean' })
  enableBudgetControl: boolean;

  @Column({ name: 'enforce_segregation', type: 'boolean' })
  enforceSegregation: boolean;

  @Column({ name: 'entry_prefix', type: 'varchar' })
  entryPrefix: string;

  @Column({ name: 'fiscal_year_start_day', type: 'numeric' })
  fiscalYearStartDay: number;

  @Column({ name: 'fiscal_year_start_month', type: 'numeric' })
  fiscalYearStartMonth: number;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'notes', type: 'varchar', nullable: true })
  notes: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'overdue_grace_days', type: 'numeric' })
  overdueGraceDays: number;

  @Column({ name: 'require_document_for_approval', type: 'boolean' })
  requireDocumentForApproval: boolean;

  @Column({ name: 'require_monthly_closure', type: 'boolean' })
  requireMonthlyClosure: boolean;

  @Column({ name: 'require_receipt_for_payment', type: 'boolean' })
  requireReceiptForPayment: boolean;

  @Column({ name: 'timezone', type: 'varchar' })
  timezone: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

}
