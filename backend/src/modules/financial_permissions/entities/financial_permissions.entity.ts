import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('financial_permissions')
export class FinancialPermissions {
  @Column({ name: 'action', type: 'varchar' })
  action: string;

  @Column({ name: 'category', type: 'varchar' })
  category: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'description', type: 'varchar', nullable: true })
  description: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'is_sensitive', type: 'boolean' })
  isSensitive: boolean;

  @Column({ name: 'key', type: 'varchar' })
  key: string;

  @Column({ name: 'name', type: 'varchar' })
  name: string;

}
