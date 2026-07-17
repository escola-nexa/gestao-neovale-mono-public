import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('hr_indication_drafts')
export class HrIndicationDrafts {
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'diretor_nome', type: 'varchar', nullable: true })
  diretorNome: string;

  @Column({ name: 'external_link_id', type: 'varchar' })
  externalLinkId: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'payload', type: 'jsonb' })
  payload: any;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

}
