import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketChecklists } from '../entities/ticket_checklists.entity';
import { UpdateTicketChecklistsDto } from '../dto/update-ticket_checklists.dto';

@Injectable()
export class UpdateTicketChecklistsService {
  constructor(
    @InjectRepository(TicketChecklists)
    private readonly repository: Repository<TicketChecklists>,
  ) {}

  async execute(id: string, dto: UpdateTicketChecklistsDto, organizationId: string): Promise<TicketChecklists> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
