import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExternalLinks } from '../entities/external_links.entity';
import { UpdateExternalLinksDto } from '../dto/update-external_links.dto';

@Injectable()
export class UpdateExternalLinksService {
  constructor(
    @InjectRepository(ExternalLinks)
    private readonly repository: Repository<ExternalLinks>,
  ) {}

  async execute(id: string, dto: UpdateExternalLinksDto, organizationId: string): Promise<ExternalLinks> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
