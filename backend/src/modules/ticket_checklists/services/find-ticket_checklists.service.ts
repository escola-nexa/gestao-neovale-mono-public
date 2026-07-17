import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { TicketChecklists } from '../entities/ticket_checklists.entity';

@Injectable()
export class FindTicketChecklistsService {
  constructor(
    @InjectRepository(TicketChecklists)
    private readonly repository: Repository<TicketChecklists>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(organizationId: string): Promise<TicketChecklists[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<TicketChecklists | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }

  async getChecklistItems(checklistId: string) {
    return this.dataSource.query(`SELECT * FROM ticket_checklist_items WHERE checklist_id = $1 ORDER BY position`, [checklistId]);
  }
}
