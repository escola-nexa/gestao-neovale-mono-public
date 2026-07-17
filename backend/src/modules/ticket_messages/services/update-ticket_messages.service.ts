import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketMessages } from '../entities/ticket_messages.entity';
import { UpdateTicketMessagesDto } from '../dto/update-ticket_messages.dto';

@Injectable()
export class UpdateTicketMessagesService {
  constructor(
    @InjectRepository(TicketMessages)
    private readonly repository: Repository<TicketMessages>,
  ) {}

  async execute(id: string, dto: UpdateTicketMessagesDto, organizationId: string): Promise<TicketMessages> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
