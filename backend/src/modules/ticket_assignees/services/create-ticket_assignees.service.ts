import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketAssignees } from '../entities/ticket_assignees.entity';
import { CreateTicketAssigneesDto } from '../dto/create-ticket_assignees.dto';

@Injectable()
export class CreateTicketAssigneesService {
  constructor(
    @InjectRepository(TicketAssignees)
    private readonly repository: Repository<TicketAssignees>,
  ) {}

  async execute(dto: CreateTicketAssigneesDto, organizationId: string): Promise<TicketAssignees> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
