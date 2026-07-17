import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('financial_categories')
export class FinancialCategories {
  @Column({ name: 'accepts_entries', type: 'boolean' })
  acceptsEntries: boolean;

  @Column({ name: 'active', type: 'boolean' })
  active: boolean;

  @Column({ name: 'category_nature', type: 'varchar' })
  categoryNature: string;

  @Column({ name: 'code', type: 'varchar', nullable: true })
  code: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'created_by', type: 'varchar', nullable: true })
  createdBy: string;

  @Column({ name: 'description', type: 'varchar', nullable: true })
  description: string;

  @Column({ name: 'entry_type', type: 'varchar' })
  entryType: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'is_system', type: 'boolean' })
  isSystem: boolean;

  @Column({ name: 'level', type: 'numeric' })
  level: number;

  @Column({ name: 'name', type: 'varchar' })
  name: string;

  @Column({ name: 'nature', type: 'varchar' })
  nature: string;

  @Column({ name: 'notes', type: 'varchar', nullable: true })
  notes: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'parent_id', type: 'varchar', nullable: true })
  parentId: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

}
