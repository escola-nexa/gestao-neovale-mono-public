import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserNotificationPrefs } from '../entities/user_notification_prefs.entity';
import { CreateUserNotificationPrefsDto } from '../dto/create-user_notification_prefs.dto';

@Injectable()
export class CreateUserNotificationPrefsService {
  constructor(
    @InjectRepository(UserNotificationPrefs)
    private readonly repository: Repository<UserNotificationPrefs>,
  ) {}

  async execute(dto: CreateUserNotificationPrefsDto, organizationId: string): Promise<UserNotificationPrefs> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
