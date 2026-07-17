import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuarterlyKeywords } from '../entities/quarterly_keywords.entity';
import { UpdateQuarterlyKeywordsDto } from '../dto/update-quarterly_keywords.dto';

@Injectable()
export class UpdateQuarterlyKeywordsService {
  constructor(
    @InjectRepository(QuarterlyKeywords)
    private readonly repository: Repository<QuarterlyKeywords>,
  ) {}

  async execute(id: string, dto: UpdateQuarterlyKeywordsDto, organizationId: string): Promise<QuarterlyKeywords> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
