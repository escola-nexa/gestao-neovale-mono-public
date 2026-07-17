import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('ticket_checklists')
export class TicketChecklists {
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'created_by', type: 'varchar', nullable: true })
  createdBy: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'position', type: 'numeric' })
  position: number;

  @Column({ name: 'ticket_id', type: 'varchar' })
  ticketId: string;

  @Column({ name: 'title', type: 'varchar' })
  title: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

}
