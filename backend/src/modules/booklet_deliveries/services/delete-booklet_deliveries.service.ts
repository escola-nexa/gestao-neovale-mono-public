import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookletDeliveries } from '../entities/booklet_deliveries.entity';

@Injectable()
export class DeleteBookletDeliveriesService {
  constructor(
    @InjectRepository(BookletDeliveries)
    private readonly repository: Repository<BookletDeliveries>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
