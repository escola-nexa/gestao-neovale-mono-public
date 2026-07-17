import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnesignalSendLog } from '../entities/onesignal_send_log.entity';
import { UpdateOnesignalSendLogDto } from '../dto/update-onesignal_send_log.dto';

@Injectable()
export class UpdateOnesignalSendLogService {
  constructor(
    @InjectRepository(OnesignalSendLog)
    private readonly repository: Repository<OnesignalSendLog>,
  ) {}

  async execute(id: string, dto: UpdateOnesignalSendLogDto, organizationId: string): Promise<OnesignalSendLog> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
