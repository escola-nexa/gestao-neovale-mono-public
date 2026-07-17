import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('professor_documents')
export class ProfessorDocuments {
  @Column({ name: 'address', type: 'varchar', nullable: true })
  address: string;

  @Column({ name: 'address_city', type: 'varchar', nullable: true })
  addressCity: string;

  @Column({ name: 'address_complement', type: 'varchar', nullable: true })
  addressComplement: string;

  @Column({ name: 'address_state', type: 'varchar', nullable: true })
  addressState: string;

  @Column({ name: 'admission_date', type: 'varchar', nullable: true })
  admissionDate: string;

  @Column({ name: 'admission_status', type: 'varchar' })
  admissionStatus: string;

  @Column({ name: 'bank_account', type: 'varchar', nullable: true })
  bankAccount: string;

  @Column({ name: 'bank_branch', type: 'varchar', nullable: true })
  bankBranch: string;

  @Column({ name: 'bank_name', type: 'varchar', nullable: true })
  bankName: string;

  @Column({ name: 'birth_city', type: 'varchar', nullable: true })
  birthCity: string;

  @Column({ name: 'birth_date', type: 'varchar', nullable: true })
  birthDate: string;

  @Column({ name: 'birth_state', type: 'varchar', nullable: true })
  birthState: string;

  @Column({ name: 'blood_type', type: 'varchar', nullable: true })
  bloodType: string;

  @Column({ name: 'cnh_category', type: 'varchar', nullable: true })
  cnhCategory: string;

  @Column({ name: 'cnh_expiry', type: 'varchar', nullable: true })
  cnhExpiry: string;

  @Column({ name: 'cnh_issue_date', type: 'varchar', nullable: true })
  cnhIssueDate: string;

  @Column({ name: 'cnh_number', type: 'varchar', nullable: true })
  cnhNumber: string;

  @Column({ name: 'cnh_state', type: 'varchar', nullable: true })
  cnhState: string;

  @Column({ name: 'cpf', type: 'varchar', nullable: true })
  cpf: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'education_level', type: 'varchar', nullable: true })
  educationLevel: string;

  @Column({ name: 'email', type: 'varchar', nullable: true })
  email: string;

  @Column({ name: 'eye_color', type: 'varchar', nullable: true })
  eyeColor: string;

  @Column({ name: 'father_name', type: 'varchar', nullable: true })
  fatherName: string;

  @Column({ name: 'first_license_date', type: 'varchar', nullable: true })
  firstLicenseDate: string;

  @Column({ name: 'full_name', type: 'varchar', nullable: true })
  fullName: string;

  @Column({ name: 'function_title', type: 'varchar', nullable: true })
  functionTitle: string;

  @Column({ name: 'gender', type: 'varchar', nullable: true })
  gender: string;

  @Column({ name: 'hair_color', type: 'varchar', nullable: true })
  hairColor: string;

  @Column({ name: 'has_sicredi_account', type: 'boolean', nullable: true })
  hasSicrediAccount: boolean;

  @Column({ name: 'height', type: 'numeric', nullable: true })
  height: number;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'marital_status', type: 'varchar', nullable: true })
  maritalStatus: string;

  @Column({ name: 'military_cert', type: 'varchar', nullable: true })
  militaryCert: string;

  @Column({ name: 'mother_name', type: 'varchar', nullable: true })
  motherName: string;

  @Column({ name: 'nationality', type: 'varchar', nullable: true })
  nationality: string;

  @Column({ name: 'neighborhood', type: 'varchar', nullable: true })
  neighborhood: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'phone', type: 'varchar', nullable: true })
  phone: string;

  @Column({ name: 'pis_nit', type: 'varchar', nullable: true })
  pisNit: string;

  @Column({ name: 'pix_key', type: 'varchar', nullable: true })
  pixKey: string;

  @Column({ name: 'pix_type', type: 'varchar', nullable: true })
  pixType: string;

  @Column({ name: 'professor_id', type: 'varchar' })
  professorId: string;

  @Column({ name: 'race', type: 'varchar', nullable: true })
  race: string;

  @Column({ name: 'registration_code', type: 'varchar', nullable: true })
  registrationCode: string;

  @Column({ name: 'rg_issue_date', type: 'varchar', nullable: true })
  rgIssueDate: string;

  @Column({ name: 'rg_issuer', type: 'varchar', nullable: true })
  rgIssuer: string;

  @Column({ name: 'rg_number', type: 'varchar', nullable: true })
  rgNumber: string;

  @Column({ name: 'rg_state', type: 'varchar', nullable: true })
  rgState: string;

  @Column({ name: 'shirt_size', type: 'varchar', nullable: true })
  shirtSize: string;

  @Column({ name: 'social_name', type: 'varchar', nullable: true })
  socialName: string;

  @Column({ name: 'specialization', type: 'varchar', nullable: true })
  specialization: string;

  @Column({ name: 'spouse_birth_city', type: 'varchar', nullable: true })
  spouseBirthCity: string;

  @Column({ name: 'spouse_birth_date', type: 'varchar', nullable: true })
  spouseBirthDate: string;

  @Column({ name: 'spouse_birth_state', type: 'varchar', nullable: true })
  spouseBirthState: string;

  @Column({ name: 'spouse_name', type: 'varchar', nullable: true })
  spouseName: string;

  @Column({ name: 'spouse_nationality', type: 'varchar', nullable: true })
  spouseNationality: string;

  @Column({ name: 'termination_date', type: 'varchar', nullable: true })
  terminationDate: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'voter_id', type: 'varchar', nullable: true })
  voterId: string;

  @Column({ name: 'voter_section', type: 'varchar', nullable: true })
  voterSection: string;

  @Column({ name: 'voter_zone', type: 'varchar', nullable: true })
  voterZone: string;

  @Column({ name: 'weight', type: 'numeric', nullable: true })
  weight: number;

  @Column({ name: 'work_card_number', type: 'varchar', nullable: true })
  workCardNumber: string;

  @Column({ name: 'work_card_series', type: 'varchar', nullable: true })
  workCardSeries: string;

  @Column({ name: 'work_card_state', type: 'varchar', nullable: true })
  workCardState: string;

  @Column({ name: 'zip_code', type: 'varchar', nullable: true })
  zipCode: string;

}
