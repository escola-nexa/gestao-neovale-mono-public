import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookletDeliveryItems } from '../entities/booklet_delivery_items.entity';

@Injectable()
export class DeleteBookletDeliveryItemsService {
  constructor(
    @InjectRepository(BookletDeliveryItems)
    private readonly repository: Repository<BookletDeliveryItems>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
