import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnesignalSendLog } from '../entities/onesignal_send_log.entity';

@Injectable()
export class DeleteOnesignalSendLogService {
  constructor(
    @InjectRepository(OnesignalSendLog)
    private readonly repository: Repository<OnesignalSendLog>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
