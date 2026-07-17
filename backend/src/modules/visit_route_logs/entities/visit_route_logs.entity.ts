import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('visit_route_logs')
export class VisitRouteLogs {
  @Column({ name: 'action', type: 'varchar' })
  action: string;

  @Column({ name: 'actor_id', type: 'varchar', nullable: true })
  actorId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'details', type: 'jsonb', nullable: true })
  details: any;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'route_id', type: 'varchar' })
  routeId: string;

}
