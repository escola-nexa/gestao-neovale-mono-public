import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookletDeliverySchools } from '../entities/booklet_delivery_schools.entity';
import { CreateBookletDeliverySchoolsDto } from '../dto/create-booklet_delivery_schools.dto';

@Injectable()
export class CreateBookletDeliverySchoolsService {
  constructor(
    @InjectRepository(BookletDeliverySchools)
    private readonly repository: Repository<BookletDeliverySchools>,
  ) {}

  async execute(dto: CreateBookletDeliverySchoolsDto, organizationId: string): Promise<BookletDeliverySchools> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
