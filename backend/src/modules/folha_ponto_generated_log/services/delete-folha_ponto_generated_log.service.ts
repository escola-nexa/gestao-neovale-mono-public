import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FolhaPontoGeneratedLog } from '../entities/folha_ponto_generated_log.entity';

@Injectable()
export class DeleteFolhaPontoGeneratedLogService {
  constructor(
    @InjectRepository(FolhaPontoGeneratedLog)
    private readonly repository: Repository<FolhaPontoGeneratedLog>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
