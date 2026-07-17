import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketWatchers } from '../entities/ticket_watchers.entity';

@Injectable()
export class FindTicketWatchersService {
  constructor(
    @InjectRepository(TicketWatchers)
    private readonly repository: Repository<TicketWatchers>,
  ) {}

  async findAll(organizationId: string): Promise<TicketWatchers[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<TicketWatchers | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
