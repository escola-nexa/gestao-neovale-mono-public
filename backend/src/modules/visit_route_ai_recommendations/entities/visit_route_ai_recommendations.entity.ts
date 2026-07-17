import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('visit_route_ai_recommendations')
export class VisitRouteAiRecommendations {
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'description', type: 'varchar', nullable: true })
  description: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'kind', type: 'varchar' })
  kind: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'payload', type: 'jsonb', nullable: true })
  payload: any;

  @Column({ name: 'route_id', type: 'varchar' })
  routeId: string;

  @Column({ name: 'status', type: 'varchar' })
  status: string;

  @Column({ name: 'title', type: 'varchar' })
  title: string;

}
