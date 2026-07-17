import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketLabels } from '../entities/ticket_labels.entity';
import { UpdateTicketLabelsDto } from '../dto/update-ticket_labels.dto';

@Injectable()
export class UpdateTicketLabelsService {
  constructor(
    @InjectRepository(TicketLabels)
    private readonly repository: Repository<TicketLabels>,
  ) {}

  async execute(id: string, dto: UpdateTicketLabelsDto, organizationId: string): Promise<TicketLabels> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
