import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketAssignees } from '../entities/ticket_assignees.entity';
import { UpdateTicketAssigneesDto } from '../dto/update-ticket_assignees.dto';

@Injectable()
export class UpdateTicketAssigneesService {
  constructor(
    @InjectRepository(TicketAssignees)
    private readonly repository: Repository<TicketAssignees>,
  ) {}

  async execute(id: string, dto: UpdateTicketAssigneesDto, organizationId: string): Promise<TicketAssignees> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
