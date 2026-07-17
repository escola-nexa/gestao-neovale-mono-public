import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketCategories } from '../entities/ticket_categories.entity';

@Injectable()
export class DeleteTicketCategoriesService {
  constructor(
    @InjectRepository(TicketCategories)
    private readonly repository: Repository<TicketCategories>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
