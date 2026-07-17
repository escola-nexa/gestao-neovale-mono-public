import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketCategories } from '../entities/ticket_categories.entity';

@Injectable()
export class FindTicketCategoriesService {
  constructor(
    @InjectRepository(TicketCategories)
    private readonly repository: Repository<TicketCategories>,
  ) {}

  async findAll(organizationId: string): Promise<TicketCategories[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<TicketCategories | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
