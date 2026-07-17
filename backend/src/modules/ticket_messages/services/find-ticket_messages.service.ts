import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketMessages } from '../entities/ticket_messages.entity';

@Injectable()
export class FindTicketMessagesService {
  constructor(
    @InjectRepository(TicketMessages)
    private readonly repository: Repository<TicketMessages>,
  ) {}

  async findAll(organizationId: string): Promise<TicketMessages[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<TicketMessages | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
