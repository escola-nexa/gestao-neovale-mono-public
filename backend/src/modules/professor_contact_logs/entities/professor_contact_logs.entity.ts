import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('professor_contact_logs')
export class ProfessorContactLogs {
  @Column({ name: 'contact_type', type: 'varchar' })
  contactType: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'created_by', type: 'varchar', nullable: true })
  createdBy: string;

  @Column({ name: 'created_by_name', type: 'varchar', nullable: true })
  createdByName: string;

  @Column({ name: 'description', type: 'varchar' })
  description: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'professor_id', type: 'varchar' })
  professorId: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

}
