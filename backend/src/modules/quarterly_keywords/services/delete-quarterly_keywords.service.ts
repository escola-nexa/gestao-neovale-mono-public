import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuarterlyKeywords } from '../entities/quarterly_keywords.entity';

@Injectable()
export class DeleteQuarterlyKeywordsService {
  constructor(
    @InjectRepository(QuarterlyKeywords)
    private readonly repository: Repository<QuarterlyKeywords>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
