import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('kanban_lists')
export class KanbanLists {
  @Column({ name: 'color', type: 'varchar' })
  color: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'is_default', type: 'boolean' })
  isDefault: boolean;

  @Column({ name: 'mapped_status', type: 'varchar', nullable: true })
  mappedStatus: string;

  @Column({ name: 'name', type: 'varchar' })
  name: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'position', type: 'numeric' })
  position: number;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

}
