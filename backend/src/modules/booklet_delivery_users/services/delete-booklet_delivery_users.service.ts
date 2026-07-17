import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookletDeliveryUsers } from '../entities/booklet_delivery_users.entity';

@Injectable()
export class DeleteBookletDeliveryUsersService {
  constructor(
    @InjectRepository(BookletDeliveryUsers)
    private readonly repository: Repository<BookletDeliveryUsers>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
