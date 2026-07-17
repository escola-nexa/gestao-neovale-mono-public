import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookletDeliverySchools } from '../entities/booklet_delivery_schools.entity';

@Injectable()
export class DeleteBookletDeliverySchoolsService {
  constructor(
    @InjectRepository(BookletDeliverySchools)
    private readonly repository: Repository<BookletDeliverySchools>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
