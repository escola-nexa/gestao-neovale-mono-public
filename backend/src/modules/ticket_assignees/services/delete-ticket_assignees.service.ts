import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketAssignees } from '../entities/ticket_assignees.entity';

@Injectable()
export class DeleteTicketAssigneesService {
  constructor(
    @InjectRepository(TicketAssignees)
    private readonly repository: Repository<TicketAssignees>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
