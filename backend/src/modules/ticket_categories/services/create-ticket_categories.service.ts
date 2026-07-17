import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketCategories } from '../entities/ticket_categories.entity';
import { CreateTicketCategoriesDto } from '../dto/create-ticket_categories.dto';

@Injectable()
export class CreateTicketCategoriesService {
  constructor(
    @InjectRepository(TicketCategories)
    private readonly repository: Repository<TicketCategories>,
  ) {}

  async execute(dto: CreateTicketCategoriesDto, organizationId: string): Promise<TicketCategories> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
