import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnesignalSendLog } from '../entities/onesignal_send_log.entity';

@Injectable()
export class FindOnesignalSendLogService {
  constructor(
    @InjectRepository(OnesignalSendLog)
    private readonly repository: Repository<OnesignalSendLog>,
  ) {}

  async findAll(organizationId: string): Promise<OnesignalSendLog[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<OnesignalSendLog | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
