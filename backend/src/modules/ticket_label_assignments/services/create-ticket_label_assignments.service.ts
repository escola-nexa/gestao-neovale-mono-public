import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketLabelAssignments } from '../entities/ticket_label_assignments.entity';
import { CreateTicketLabelAssignmentsDto } from '../dto/create-ticket_label_assignments.dto';

@Injectable()
export class CreateTicketLabelAssignmentsService {
  constructor(
    @InjectRepository(TicketLabelAssignments)
    private readonly repository: Repository<TicketLabelAssignments>,
  ) {}

  async execute(dto: CreateTicketLabelAssignmentsDto, organizationId: string): Promise<TicketLabelAssignments> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
