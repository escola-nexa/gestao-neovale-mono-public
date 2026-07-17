import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookletDeliveryItems } from '../entities/booklet_delivery_items.entity';
import { CreateBookletDeliveryItemsDto } from '../dto/create-booklet_delivery_items.dto';

@Injectable()
export class CreateBookletDeliveryItemsService {
  constructor(
    @InjectRepository(BookletDeliveryItems)
    private readonly repository: Repository<BookletDeliveryItems>,
  ) {}

  async execute(dto: CreateBookletDeliveryItemsDto, organizationId: string): Promise<BookletDeliveryItems> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
