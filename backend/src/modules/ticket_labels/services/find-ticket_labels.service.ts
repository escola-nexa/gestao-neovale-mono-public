import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketLabels } from '../entities/ticket_labels.entity';

@Injectable()
export class FindTicketLabelsService {
  constructor(
    @InjectRepository(TicketLabels)
    private readonly repository: Repository<TicketLabels>,
  ) {}

  async findAll(organizationId: string): Promise<TicketLabels[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<TicketLabels | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
