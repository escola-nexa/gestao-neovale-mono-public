import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserNotificationPrefs } from '../entities/user_notification_prefs.entity';

@Injectable()
export class FindUserNotificationPrefsService {
  constructor(
    @InjectRepository(UserNotificationPrefs)
    private readonly repository: Repository<UserNotificationPrefs>,
  ) {}

  async findAll(organizationId: string): Promise<UserNotificationPrefs[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<UserNotificationPrefs | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
