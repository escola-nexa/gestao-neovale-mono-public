import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('formative_tracks')
export class FormativeTracks {
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'deleted_at', type: 'varchar', nullable: true })
  deletedAt: string;

  @Column({ name: 'description', type: 'varchar', nullable: true })
  description: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'name', type: 'varchar' })
  name: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'status', type: 'varchar' })
  status: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

}
