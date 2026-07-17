import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('hr_settings')
export class HrSettings {
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'default_pedagogica_aulas', type: 'numeric' })
  defaultPedagogicaAulas: number;

  @Column({ name: 'default_ucp1_aulas', type: 'numeric' })
  defaultUcp1Aulas: number;

  @Column({ name: 'default_ucp2_aulas', type: 'numeric' })
  defaultUcp2Aulas: number;

  @Column({ name: 'default_ucp3_aulas', type: 'numeric' })
  defaultUcp3Aulas: number;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'max_planning_per_professor', type: 'numeric' })
  maxPlanningPerProfessor: number;

  @Column({ name: 'organization_id', type: 'varchar' })
  organizationId: string;

  @Column({ name: 'regra_horas_pem', type: 'numeric' })
  regraHorasPem: number;

  @Column({ name: 'regra_horas_uci', type: 'numeric' })
  regraHorasUci: number;

  @Column({ name: 'regra_horas_ucii', type: 'numeric' })
  regraHorasUcii: number;

  @Column({ name: 'regra_horas_uciii', type: 'numeric' })
  regraHorasUciii: number;

  @Column({ name: 'shift_afternoon_end', type: 'varchar' })
  shiftAfternoonEnd: string;

  @Column({ name: 'shift_morning_end', type: 'varchar' })
  shiftMorningEnd: string;

  @Column({ name: 'teto_ch_semanal', type: 'numeric' })
  tetoChSemanal: number;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

}
