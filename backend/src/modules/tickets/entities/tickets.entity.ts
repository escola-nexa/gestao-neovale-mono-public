import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('tickets')
export class Tickets {
  @Column({ name: 'archived_at', type: 'varchar', nullable: true })
  archivedAt: string;

  @Column({ name: 'category_id', type: 'varchar', nullable: true })
  categoryId: string;

  @Column({ name: 'closed_at', type: 'varchar', nullable: true })
  closedAt: string;

  @Column({ name: 'cover_color', type: 'varchar', nullable: true })
  coverColor: string;

  @Column({ name: 'cover_url', type: 'varchar', nullable: true })
  coverUrl: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'created_by', type: 'varchar', nullable: true })
  createdBy: string;

  @Column({ name: 'description', type: 'varchar', nullable: true })
  description: string;

  @Column({ name: 'due_date', type: 'varchar', nullable: true })
  dueDate: string;

  @Column({ name: 'external_author_name', type: 'varchar', nullable: true })
  externalAuthorName: string;

  @Column({ name: 'external_token', type: 'varchar', nullable: true })
  externalToken: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'kanban_list_id', type: 'varchar', nullable: true })
  kanbanListId: string;

  @Column({ name: 'kanban_position', type: 'numeric' })
  kanbanPosition: number;

  @Column({ name: 'nexa_responsible_id', type: 'varchar', nullable: true })
  nexaResponsibleId: string;

  @Column({ name: 'opened_by_id', type: 'varchar', nullable: true })
  openedById: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'priority', type: 'varchar' })
  priority: string;

  @Column({ name: 'school_id', type: 'varchar', nullable: true })
  schoolId: string;

  @Column({ name: 'school_responsible_id', type: 'varchar', nullable: true })
  schoolResponsibleId: string;

  @Column({ name: 'status', type: 'varchar' })
  status: string;

  @Column({ name: 'tags', type: 'jsonb', nullable: true })
  tags: any;

  @Column({ name: 'title', type: 'varchar' })
  title: string;

  @Column({ name: 'type', type: 'varchar' })
  type: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

}
