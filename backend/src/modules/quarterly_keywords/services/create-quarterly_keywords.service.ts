import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuarterlyKeywords } from '../entities/quarterly_keywords.entity';
import { CreateQuarterlyKeywordsDto } from '../dto/create-quarterly_keywords.dto';

@Injectable()
export class CreateQuarterlyKeywordsService {
  constructor(
    @InjectRepository(QuarterlyKeywords)
    private readonly repository: Repository<QuarterlyKeywords>,
  ) {}

  async execute(dto: CreateQuarterlyKeywordsDto, organizationId: string): Promise<QuarterlyKeywords> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
