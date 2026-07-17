import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('financial_role_templates')
export class FinancialRoleTemplates {
  @Column({ name: 'code', type: 'varchar' })
  code: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'description', type: 'varchar', nullable: true })
  description: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'is_system', type: 'boolean' })
  isSystem: boolean;

  @Column({ name: 'name', type: 'varchar' })
  name: string;

  @Column({ name: 'organization_id', type: 'varchar', nullable: true })
  organizationId: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

}
