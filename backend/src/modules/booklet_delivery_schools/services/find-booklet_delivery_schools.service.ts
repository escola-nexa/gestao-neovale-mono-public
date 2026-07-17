import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookletDeliverySchools } from '../entities/booklet_delivery_schools.entity';

@Injectable()
export class FindBookletDeliverySchoolsService {
  constructor(
    @InjectRepository(BookletDeliverySchools)
    private readonly repository: Repository<BookletDeliverySchools>,
  ) {}

  async findAll(organizationId: string): Promise<BookletDeliverySchools[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<BookletDeliverySchools | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
