import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookletDeliverySchools } from '../entities/booklet_delivery_schools.entity';
import { UpdateBookletDeliverySchoolsDto } from '../dto/update-booklet_delivery_schools.dto';

@Injectable()
export class UpdateBookletDeliverySchoolsService {
  constructor(
    @InjectRepository(BookletDeliverySchools)
    private readonly repository: Repository<BookletDeliverySchools>,
  ) {}

  async execute(id: string, dto: UpdateBookletDeliverySchoolsDto, organizationId: string): Promise<BookletDeliverySchools> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
