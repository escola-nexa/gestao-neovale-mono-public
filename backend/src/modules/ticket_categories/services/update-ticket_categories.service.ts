import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketCategories } from '../entities/ticket_categories.entity';
import { UpdateTicketCategoriesDto } from '../dto/update-ticket_categories.dto';

@Injectable()
export class UpdateTicketCategoriesService {
  constructor(
    @InjectRepository(TicketCategories)
    private readonly repository: Repository<TicketCategories>,
  ) {}

  async execute(id: string, dto: UpdateTicketCategoriesDto, organizationId: string): Promise<TicketCategories> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
