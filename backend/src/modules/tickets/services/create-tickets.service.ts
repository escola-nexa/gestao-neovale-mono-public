import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Tickets } from '../entities/tickets.entity';
import { CreateTicketsDto } from '../dto/create-tickets.dto';

@Injectable()
export class CreateTicketsService {
  constructor(
    @InjectRepository(Tickets)
    private readonly repository: Repository<Tickets>,
    private readonly dataSource: DataSource,
  ) {}

  async execute(dto: CreateTicketsDto, organizationId: string): Promise<Tickets> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }

  async addTicketLabel(ticketId: string, labelId: string) {
    await this.dataSource.query(`INSERT INTO ticket_label_assignments (ticket_id, label_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [ticketId, labelId]);
    return { success: true };
  }

  async insertTicketLabelsBulk(payload: { ticket_id: string, label_id: string }[]) {
    if (!payload.length) return { success: true };
    const values = payload.map(p => `('${p.ticket_id}', '${p.label_id}')`).join(',');
    await this.dataSource.query(`INSERT INTO ticket_label_assignments (ticket_id, label_id) VALUES ${values} ON CONFLICT DO NOTHING`);
    return { success: true };
  }
}
