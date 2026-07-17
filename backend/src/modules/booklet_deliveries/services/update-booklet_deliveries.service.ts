import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookletDeliveries } from '../entities/booklet_deliveries.entity';
import { UpdateBookletDeliveriesDto } from '../dto/update-booklet_deliveries.dto';

@Injectable()
export class UpdateBookletDeliveriesService {
  constructor(
    @InjectRepository(BookletDeliveries)
    private readonly repository: Repository<BookletDeliveries>,
  ) {}

  async execute(id: string, dto: UpdateBookletDeliveriesDto, organizationId: string): Promise<BookletDeliveries> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
