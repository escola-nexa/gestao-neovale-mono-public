import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tickets } from '../entities/tickets.entity';
import { UpdateTicketsDto } from '../dto/update-tickets.dto';

@Injectable()
export class UpdateTicketsService {
  constructor(
    @InjectRepository(Tickets)
    private readonly repository: Repository<Tickets>,
  ) {}

  async execute(id: string, dto: UpdateTicketsDto, organizationId: string): Promise<Tickets> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
