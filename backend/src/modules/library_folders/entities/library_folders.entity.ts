import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('library_folders')
export class LibraryFolders {
  @Column({ name: 'category_id', type: 'varchar' })
  categoryId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'created_by', type: 'varchar', nullable: true })
  createdBy: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'name', type: 'varchar' })
  name: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'parent_id', type: 'varchar', nullable: true })
  parentId: string;

  @Column({ name: 'sort_order', type: 'numeric' })
  sortOrder: number;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

}
