import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExternalLinks } from '../entities/external_links.entity';

@Injectable()
export class FindExternalLinksService {
  constructor(
    @InjectRepository(ExternalLinks)
    private readonly repository: Repository<ExternalLinks>,
  ) {}

  async findAll(organizationId: string): Promise<ExternalLinks[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<ExternalLinks | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
