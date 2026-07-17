import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('financial_parties')
export class FinancialParties {
  @Column({ name: 'active', type: 'boolean' })
  active: boolean;

  @Column({ name: 'address_city', type: 'varchar', nullable: true })
  addressCity: string;

  @Column({ name: 'address_complement', type: 'varchar', nullable: true })
  addressComplement: string;

  @Column({ name: 'address_district', type: 'varchar', nullable: true })
  addressDistrict: string;

  @Column({ name: 'address_number', type: 'varchar', nullable: true })
  addressNumber: string;

  @Column({ name: 'address_state', type: 'varchar', nullable: true })
  addressState: string;

  @Column({ name: 'address_street', type: 'varchar', nullable: true })
  addressStreet: string;

  @Column({ name: 'address_zip', type: 'varchar', nullable: true })
  addressZip: string;

  @Column({ name: 'bank_account', type: 'varchar', nullable: true })
  bankAccount: string;

  @Column({ name: 'bank_agency', type: 'varchar', nullable: true })
  bankAgency: string;

  @Column({ name: 'bank_name', type: 'varchar', nullable: true })
  bankName: string;

  @Column({ name: 'block_reason', type: 'varchar', nullable: true })
  blockReason: string;

  @Column({ name: 'blocked_at', type: 'varchar', nullable: true })
  blockedAt: string;

  @Column({ name: 'blocked_by', type: 'varchar', nullable: true })
  blockedBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'created_by', type: 'varchar', nullable: true })
  createdBy: string;

  @Column({ name: 'default_category_id', type: 'varchar', nullable: true })
  defaultCategoryId: string;

  @Column({ name: 'default_cost_center_id', type: 'varchar', nullable: true })
  defaultCostCenterId: string;

  @Column({ name: 'default_payment_method_id', type: 'varchar', nullable: true })
  defaultPaymentMethodId: string;

  @Column({ name: 'document', type: 'varchar', nullable: true })
  document: string;

  @Column({ name: 'document_type', type: 'varchar', nullable: true })
  documentType: string;

  @Column({ name: 'email', type: 'varchar', nullable: true })
  email: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'is_blocked', type: 'boolean' })
  isBlocked: boolean;

  @Column({ name: 'legal_name', type: 'varchar', nullable: true })
  legalName: string;

  @Column({ name: 'name', type: 'varchar' })
  name: string;

  @Column({ name: 'notes', type: 'varchar', nullable: true })
  notes: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'party_type', type: 'varchar' })
  partyType: string;

  @Column({ name: 'party_types', type: 'jsonb' })
  partyTypes: any;

  @Column({ name: 'person_type', type: 'varchar' })
  personType: string;

  @Column({ name: 'phone', type: 'varchar', nullable: true })
  phone: string;

  @Column({ name: 'pix_key', type: 'varchar', nullable: true })
  pixKey: string;

  @Column({ name: 'pix_key_type', type: 'varchar', nullable: true })
  pixKeyType: string;

  @Column({ name: 'professor_id', type: 'varchar', nullable: true })
  professorId: string;

  @Column({ name: 'profile_id', type: 'varchar', nullable: true })
  profileId: string;

  @Column({ name: 'state_registration', type: 'varchar', nullable: true })
  stateRegistration: string;

  @Column({ name: 'trade_name', type: 'varchar', nullable: true })
  tradeName: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

}
