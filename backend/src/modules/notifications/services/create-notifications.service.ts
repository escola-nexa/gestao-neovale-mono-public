import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notifications } from '../entities/notifications.entity';
import { CreateNotificationsDto } from '../dto/create-notifications.dto';

@Injectable()
export class CreateNotificationsService {
  constructor(
    @InjectRepository(Notifications)
    private readonly repository: Repository<Notifications>,
  ) {}

  async execute(dto: CreateNotificationsDto, organizationId: string): Promise<Notifications> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
