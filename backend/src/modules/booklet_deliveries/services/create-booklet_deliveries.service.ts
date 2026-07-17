import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookletDeliveries } from '../entities/booklet_deliveries.entity';
import { CreateBookletDeliveriesDto } from '../dto/create-booklet_deliveries.dto';

@Injectable()
export class CreateBookletDeliveriesService {
  constructor(
    @InjectRepository(BookletDeliveries)
    private readonly repository: Repository<BookletDeliveries>,
  ) {}

  async execute(dto: CreateBookletDeliveriesDto, organizationId: string): Promise<BookletDeliveries> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
