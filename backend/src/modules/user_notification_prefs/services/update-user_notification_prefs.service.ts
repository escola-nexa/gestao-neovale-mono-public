import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserNotificationPrefs } from '../entities/user_notification_prefs.entity';
import { UpdateUserNotificationPrefsDto } from '../dto/update-user_notification_prefs.dto';

@Injectable()
export class UpdateUserNotificationPrefsService {
  constructor(
    @InjectRepository(UserNotificationPrefs)
    private readonly repository: Repository<UserNotificationPrefs>,
  ) {}

  async execute(id: string, dto: UpdateUserNotificationPrefsDto, organizationId: string): Promise<UserNotificationPrefs> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
