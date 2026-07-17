import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExternalAccessLogs } from '../entities/external_access_logs.entity';
import { CreateExternalAccessLogsDto } from '../dto/create-external_access_logs.dto';

@Injectable()
export class CreateExternalAccessLogsService {
  constructor(
    @InjectRepository(ExternalAccessLogs)
    private readonly repository: Repository<ExternalAccessLogs>,
  ) {}

  async execute(dto: CreateExternalAccessLogsDto, organizationId: string): Promise<ExternalAccessLogs> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
