import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('quarterly_keywords')
export class QuarterlyKeywords {
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'created_by', type: 'varchar' })
  createdBy: string;

  @Column({ name: 'expires_at', type: 'varchar' })
  expiresAt: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'is_active', type: 'boolean' })
  isActive: boolean;

  @Column({ name: 'keyword_hash', type: 'varchar' })
  keywordHash: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'starts_at', type: 'varchar' })
  startsAt: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

}
