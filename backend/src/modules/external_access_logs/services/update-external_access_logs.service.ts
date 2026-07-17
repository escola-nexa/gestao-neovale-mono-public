import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExternalAccessLogs } from '../entities/external_access_logs.entity';
import { UpdateExternalAccessLogsDto } from '../dto/update-external_access_logs.dto';

@Injectable()
export class UpdateExternalAccessLogsService {
  constructor(
    @InjectRepository(ExternalAccessLogs)
    private readonly repository: Repository<ExternalAccessLogs>,
  ) {}

  async execute(id: string, dto: UpdateExternalAccessLogsDto, organizationId: string): Promise<ExternalAccessLogs> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
