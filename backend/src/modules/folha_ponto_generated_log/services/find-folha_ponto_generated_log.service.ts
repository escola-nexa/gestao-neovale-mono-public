import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FolhaPontoGeneratedLog } from '../entities/folha_ponto_generated_log.entity';

@Injectable()
export class FindFolhaPontoGeneratedLogService {
  constructor(
    @InjectRepository(FolhaPontoGeneratedLog)
    private readonly repository: Repository<FolhaPontoGeneratedLog>,
  ) {}

  async findAll(organizationId: string): Promise<FolhaPontoGeneratedLog[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<FolhaPontoGeneratedLog | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
