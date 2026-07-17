import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketWatchers } from '../entities/ticket_watchers.entity';
import { CreateTicketWatchersDto } from '../dto/create-ticket_watchers.dto';

@Injectable()
export class CreateTicketWatchersService {
  constructor(
    @InjectRepository(TicketWatchers)
    private readonly repository: Repository<TicketWatchers>,
  ) {}

  async execute(dto: CreateTicketWatchersDto, organizationId: string): Promise<TicketWatchers> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
