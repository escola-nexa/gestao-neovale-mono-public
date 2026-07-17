import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PwaPushedNotifications } from '../entities/pwa_pushed_notifications.entity';
import { UpdatePwaPushedNotificationsDto } from '../dto/update-pwa_pushed_notifications.dto';

@Injectable()
export class UpdatePwaPushedNotificationsService {
  constructor(
    @InjectRepository(PwaPushedNotifications)
    private readonly repository: Repository<PwaPushedNotifications>,
  ) {}

  async execute(id: string, dto: UpdatePwaPushedNotificationsDto, organizationId: string): Promise<PwaPushedNotifications> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
