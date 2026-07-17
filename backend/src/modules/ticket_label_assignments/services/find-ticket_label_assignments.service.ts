import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketLabelAssignments } from '../entities/ticket_label_assignments.entity';

@Injectable()
export class FindTicketLabelAssignmentsService {
  constructor(
    @InjectRepository(TicketLabelAssignments)
    private readonly repository: Repository<TicketLabelAssignments>,
  ) {}

  async findAll(organizationId: string): Promise<TicketLabelAssignments[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<TicketLabelAssignments | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
