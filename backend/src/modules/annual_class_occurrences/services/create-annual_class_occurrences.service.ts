import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnnualClassOccurrences } from '../entities/annual_class_occurrences.entity';
import { CreateAnnualClassOccurrencesDto } from '../dto/create-annual_class_occurrences.dto';

@Injectable()
export class CreateAnnualClassOccurrencesService {
  constructor(
    @InjectRepository(AnnualClassOccurrences)
    private readonly repository: Repository<AnnualClassOccurrences>,
  ) {}

  async execute(dto: CreateAnnualClassOccurrencesDto, organizationId: string): Promise<AnnualClassOccurrences> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
