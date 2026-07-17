import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('financial_user_scopes')
export class FinancialUserScopes {
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'created_by', type: 'varchar', nullable: true })
  createdBy: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'scope_type', type: 'varchar' })
  scopeType: string;

  @Column({ name: 'scope_value', type: 'varchar' })
  scopeValue: string;

  @Column({ name: 'user_id', type: 'varchar' })
  userId: string;

}
