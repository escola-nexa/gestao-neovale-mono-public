import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('financial_role_template_permissions')
export class FinancialRoleTemplatePermissions {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'permission_id', type: 'varchar' })
  permissionId: string;

  @Column({ name: 'template_id', type: 'varchar' })
  templateId: string;

}
