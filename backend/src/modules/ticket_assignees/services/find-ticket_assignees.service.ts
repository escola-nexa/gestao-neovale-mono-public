import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketAssignees } from '../entities/ticket_assignees.entity';

@Injectable()
export class FindTicketAssigneesService {
  constructor(
    @InjectRepository(TicketAssignees)
    private readonly repository: Repository<TicketAssignees>,
  ) {}

  async findAll(organizationId: string): Promise<TicketAssignees[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<TicketAssignees | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
