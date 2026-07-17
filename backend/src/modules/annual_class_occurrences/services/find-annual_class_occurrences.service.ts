import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnnualClassOccurrences } from '../entities/annual_class_occurrences.entity';

@Injectable()
export class FindAnnualClassOccurrencesService {
  constructor(
    @InjectRepository(AnnualClassOccurrences)
    private readonly repository: Repository<AnnualClassOccurrences>,
  ) {}

  async findAll(organizationId: string): Promise<AnnualClassOccurrences[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<AnnualClassOccurrences | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
