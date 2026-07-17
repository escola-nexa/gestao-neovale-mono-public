import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('ticket_label_assignments')
export class TicketLabelAssignments {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'label_id', type: 'varchar' })
  labelId: string;

  @Column({ name: 'ticket_id', type: 'varchar' })
  ticketId: string;

}
