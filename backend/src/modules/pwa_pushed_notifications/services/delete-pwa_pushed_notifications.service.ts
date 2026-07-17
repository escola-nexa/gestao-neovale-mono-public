import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PwaPushedNotifications } from '../entities/pwa_pushed_notifications.entity';

@Injectable()
export class DeletePwaPushedNotificationsService {
  constructor(
    @InjectRepository(PwaPushedNotifications)
    private readonly repository: Repository<PwaPushedNotifications>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
