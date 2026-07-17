import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('pre_planning_materials')
export class PrePlanningMaterials {
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'display_order', type: 'numeric' })
  displayOrder: number;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'lesson_material_id', type: 'varchar' })
  lessonMaterialId: string;

  @Column({ name: 'pre_planning_id', type: 'varchar' })
  prePlanningId: string;

}
