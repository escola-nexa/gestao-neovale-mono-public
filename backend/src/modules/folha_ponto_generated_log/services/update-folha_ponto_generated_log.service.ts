import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FolhaPontoGeneratedLog } from '../entities/folha_ponto_generated_log.entity';
import { UpdateFolhaPontoGeneratedLogDto } from '../dto/update-folha_ponto_generated_log.dto';

@Injectable()
export class UpdateFolhaPontoGeneratedLogService {
  constructor(
    @InjectRepository(FolhaPontoGeneratedLog)
    private readonly repository: Repository<FolhaPontoGeneratedLog>,
  ) {}

  async execute(id: string, dto: UpdateFolhaPontoGeneratedLogDto, organizationId: string): Promise<FolhaPontoGeneratedLog> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
