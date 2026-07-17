import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketLabelAssignments } from '../entities/ticket_label_assignments.entity';
import { UpdateTicketLabelAssignmentsDto } from '../dto/update-ticket_label_assignments.dto';

@Injectable()
export class UpdateTicketLabelAssignmentsService {
  constructor(
    @InjectRepository(TicketLabelAssignments)
    private readonly repository: Repository<TicketLabelAssignments>,
  ) {}

  async execute(id: string, dto: UpdateTicketLabelAssignmentsDto, organizationId: string): Promise<TicketLabelAssignments> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
