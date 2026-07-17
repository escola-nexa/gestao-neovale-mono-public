import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('ticket_watchers')
export class TicketWatchers {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'ticket_id', type: 'varchar' })
  ticketId: string;

  @Column({ name: 'user_id', type: 'varchar' })
  userId: string;

}
