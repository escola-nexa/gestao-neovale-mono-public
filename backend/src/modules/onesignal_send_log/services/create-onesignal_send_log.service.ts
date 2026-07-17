import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnesignalSendLog } from '../entities/onesignal_send_log.entity';
import { CreateOnesignalSendLogDto } from '../dto/create-onesignal_send_log.dto';

@Injectable()
export class CreateOnesignalSendLogService {
  constructor(
    @InjectRepository(OnesignalSendLog)
    private readonly repository: Repository<OnesignalSendLog>,
  ) {}

  async execute(dto: CreateOnesignalSendLogDto, organizationId: string): Promise<OnesignalSendLog> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
