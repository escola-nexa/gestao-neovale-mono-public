import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookletDeliveryItems } from '../entities/booklet_delivery_items.entity';

@Injectable()
export class FindBookletDeliveryItemsService {
  constructor(
    @InjectRepository(BookletDeliveryItems)
    private readonly repository: Repository<BookletDeliveryItems>,
  ) {}

  async findAll(organizationId: string): Promise<BookletDeliveryItems[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<BookletDeliveryItems | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
