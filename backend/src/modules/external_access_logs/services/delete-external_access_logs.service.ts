import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExternalAccessLogs } from '../entities/external_access_logs.entity';

@Injectable()
export class DeleteExternalAccessLogsService {
  constructor(
    @InjectRepository(ExternalAccessLogs)
    private readonly repository: Repository<ExternalAccessLogs>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
