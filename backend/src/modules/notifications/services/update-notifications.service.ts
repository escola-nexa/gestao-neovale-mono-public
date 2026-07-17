import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notifications } from '../entities/notifications.entity';
import { UpdateNotificationsDto } from '../dto/update-notifications.dto';

@Injectable()
export class UpdateNotificationsService {
  constructor(
    @InjectRepository(Notifications)
    private readonly repository: Repository<Notifications>,
  ) {}

  async execute(id: string, dto: UpdateNotificationsDto, organizationId: string): Promise<Notifications> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
