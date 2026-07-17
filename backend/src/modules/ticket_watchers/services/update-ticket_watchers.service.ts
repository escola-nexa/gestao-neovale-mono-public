import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketWatchers } from '../entities/ticket_watchers.entity';
import { UpdateTicketWatchersDto } from '../dto/update-ticket_watchers.dto';

@Injectable()
export class UpdateTicketWatchersService {
  constructor(
    @InjectRepository(TicketWatchers)
    private readonly repository: Repository<TicketWatchers>,
  ) {}

  async execute(id: string, dto: UpdateTicketWatchersDto, organizationId: string): Promise<TicketWatchers> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
