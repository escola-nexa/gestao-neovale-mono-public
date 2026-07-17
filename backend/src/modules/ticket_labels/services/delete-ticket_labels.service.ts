import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketLabels } from '../entities/ticket_labels.entity';

@Injectable()
export class DeleteTicketLabelsService {
  constructor(
    @InjectRepository(TicketLabels)
    private readonly repository: Repository<TicketLabels>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
