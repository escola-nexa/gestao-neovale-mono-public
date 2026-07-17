import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FolhaPontoGeneratedLog } from '../entities/folha_ponto_generated_log.entity';
import { CreateFolhaPontoGeneratedLogDto } from '../dto/create-folha_ponto_generated_log.dto';

@Injectable()
export class CreateFolhaPontoGeneratedLogService {
  constructor(
    @InjectRepository(FolhaPontoGeneratedLog)
    private readonly repository: Repository<FolhaPontoGeneratedLog>,
  ) {}

  async execute(dto: CreateFolhaPontoGeneratedLogDto, organizationId: string): Promise<FolhaPontoGeneratedLog> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
