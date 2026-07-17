import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketMessages } from '../entities/ticket_messages.entity';
import { CreateTicketMessagesDto } from '../dto/create-ticket_messages.dto';

@Injectable()
export class CreateTicketMessagesService {
  constructor(
    @InjectRepository(TicketMessages)
    private readonly repository: Repository<TicketMessages>,
  ) {}

  async execute(dto: CreateTicketMessagesDto, organizationId: string): Promise<TicketMessages> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
