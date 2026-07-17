import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExternalLinks } from '../entities/external_links.entity';
import { CreateExternalLinksDto } from '../dto/create-external_links.dto';

@Injectable()
export class CreateExternalLinksService {
  constructor(
    @InjectRepository(ExternalLinks)
    private readonly repository: Repository<ExternalLinks>,
  ) {}

  async execute(dto: CreateExternalLinksDto, organizationId: string): Promise<ExternalLinks> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
