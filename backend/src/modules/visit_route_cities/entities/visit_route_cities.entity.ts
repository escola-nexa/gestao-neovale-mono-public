import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('visit_route_cities')
export class VisitRouteCities {
  @Column({ name: 'city', type: 'varchar' })
  city: string;

  @Column({ name: 'cluster_label', type: 'varchar', nullable: true })
  clusterLabel: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'route_id', type: 'varchar' })
  routeId: string;

  @Column({ name: 'school_count', type: 'numeric' })
  schoolCount: number;

  @Column({ name: 'uf', type: 'varchar', nullable: true })
  uf: string;

}
