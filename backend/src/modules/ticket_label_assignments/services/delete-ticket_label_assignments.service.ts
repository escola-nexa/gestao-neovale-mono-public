import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketLabelAssignments } from '../entities/ticket_label_assignments.entity';

@Injectable()
export class DeleteTicketLabelAssignmentsService {
  constructor(
    @InjectRepository(TicketLabelAssignments)
    private readonly repository: Repository<TicketLabelAssignments>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
