import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Tickets } from '../entities/tickets.entity';

@Injectable()
export class DeleteTicketsService {
  constructor(
    @InjectRepository(Tickets)
    private readonly repository: Repository<Tickets>,
    private readonly dataSource: DataSource,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }

  async deleteAssignees(ticketId: string): Promise<void> {
    await this.dataSource.query(`DELETE FROM ticket_assignees WHERE ticket_id = $1`, [ticketId]);
  }

  async removeTicketLabel(ticketId: string, labelId: string): Promise<void> {
    await this.dataSource.query(`DELETE FROM ticket_label_assignments WHERE ticket_id = $1 AND label_id = $2`, [ticketId, labelId]);
  }
}
