import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketLabels } from '../entities/ticket_labels.entity';
import { CreateTicketLabelsDto } from '../dto/create-ticket_labels.dto';

@Injectable()
export class CreateTicketLabelsService {
  constructor(
    @InjectRepository(TicketLabels)
    private readonly repository: Repository<TicketLabels>,
  ) {}

  async execute(dto: CreateTicketLabelsDto, organizationId: string): Promise<TicketLabels> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
