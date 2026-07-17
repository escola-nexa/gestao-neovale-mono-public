import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookletDeliveryItems } from '../entities/booklet_delivery_items.entity';
import { UpdateBookletDeliveryItemsDto } from '../dto/update-booklet_delivery_items.dto';

@Injectable()
export class UpdateBookletDeliveryItemsService {
  constructor(
    @InjectRepository(BookletDeliveryItems)
    private readonly repository: Repository<BookletDeliveryItems>,
  ) {}

  async execute(id: string, dto: UpdateBookletDeliveryItemsDto, organizationId: string): Promise<BookletDeliveryItems> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
