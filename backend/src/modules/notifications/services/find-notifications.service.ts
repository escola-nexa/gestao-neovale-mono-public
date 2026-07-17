import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notifications } from '../entities/notifications.entity';

@Injectable()
export class FindNotificationsService {
  constructor(
    @InjectRepository(Notifications)
    private readonly repository: Repository<Notifications>,
  ) {}

  async findAll(organizationId: string): Promise<Notifications[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<Notifications | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
