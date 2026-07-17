import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnnualClassOccurrences } from '../entities/annual_class_occurrences.entity';
import { UpdateAnnualClassOccurrencesDto } from '../dto/update-annual_class_occurrences.dto';

@Injectable()
export class UpdateAnnualClassOccurrencesService {
  constructor(
    @InjectRepository(AnnualClassOccurrences)
    private readonly repository: Repository<AnnualClassOccurrences>,
  ) {}

  async execute(id: string, dto: UpdateAnnualClassOccurrencesDto, organizationId: string): Promise<AnnualClassOccurrences> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
