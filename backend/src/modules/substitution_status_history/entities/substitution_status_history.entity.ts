import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('substitution_status_history')
export class SubstitutionStatusHistory {
  @Column({ name: 'changed_by', type: 'varchar', nullable: true })
  changedBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'from_status', type: 'varchar', nullable: true })
  fromStatus: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'note', type: 'varchar', nullable: true })
  note: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'substitution_id', type: 'varchar' })
  substitutionId: string;

  @Column({ name: 'to_status', type: 'varchar' })
  toStatus: string;

}
