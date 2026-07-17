import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookletDeliveries } from '../entities/booklet_deliveries.entity';

@Injectable()
export class FindBookletDeliveriesService {
  constructor(
    @InjectRepository(BookletDeliveries)
    private readonly repository: Repository<BookletDeliveries>,
  ) {}

  async findAll(organizationId: string): Promise<BookletDeliveries[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<BookletDeliveries | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
