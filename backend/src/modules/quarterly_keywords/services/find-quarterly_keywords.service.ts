import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuarterlyKeywords } from '../entities/quarterly_keywords.entity';

@Injectable()
export class FindQuarterlyKeywordsService {
  constructor(
    @InjectRepository(QuarterlyKeywords)
    private readonly repository: Repository<QuarterlyKeywords>,
  ) {}

  async findAll(organizationId: string): Promise<QuarterlyKeywords[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<QuarterlyKeywords | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
