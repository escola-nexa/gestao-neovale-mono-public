import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PwaPushedNotifications } from '../entities/pwa_pushed_notifications.entity';
import { CreatePwaPushedNotificationsDto } from '../dto/create-pwa_pushed_notifications.dto';

@Injectable()
export class CreatePwaPushedNotificationsService {
  constructor(
    @InjectRepository(PwaPushedNotifications)
    private readonly repository: Repository<PwaPushedNotifications>,
  ) {}

  async execute(dto: CreatePwaPushedNotificationsDto, organizationId: string): Promise<PwaPushedNotifications> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
