import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PwaPushedNotifications } from '../entities/pwa_pushed_notifications.entity';

@Injectable()
export class FindPwaPushedNotificationsService {
  constructor(
    @InjectRepository(PwaPushedNotifications)
    private readonly repository: Repository<PwaPushedNotifications>,
  ) {}

  async findAll(organizationId: string): Promise<PwaPushedNotifications[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<PwaPushedNotifications | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
