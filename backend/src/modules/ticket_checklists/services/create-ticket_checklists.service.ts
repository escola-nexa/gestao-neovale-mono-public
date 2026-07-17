import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketChecklists } from '../entities/ticket_checklists.entity';
import { CreateTicketChecklistsDto } from '../dto/create-ticket_checklists.dto';

@Injectable()
export class CreateTicketChecklistsService {
  constructor(
    @InjectRepository(TicketChecklists)
    private readonly repository: Repository<TicketChecklists>,
  ) {}

  async execute(dto: CreateTicketChecklistsDto, organizationId: string): Promise<TicketChecklists> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
