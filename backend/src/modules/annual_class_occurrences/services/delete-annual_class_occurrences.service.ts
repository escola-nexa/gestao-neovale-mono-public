import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnnualClassOccurrences } from '../entities/annual_class_occurrences.entity';

@Injectable()
export class DeleteAnnualClassOccurrencesService {
  constructor(
    @InjectRepository(AnnualClassOccurrences)
    private readonly repository: Repository<AnnualClassOccurrences>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
