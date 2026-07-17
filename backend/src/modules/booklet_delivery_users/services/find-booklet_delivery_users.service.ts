import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookletDeliveryUsers } from '../entities/booklet_delivery_users.entity';

@Injectable()
export class FindBookletDeliveryUsersService {
  constructor(
    @InjectRepository(BookletDeliveryUsers)
    private readonly repository: Repository<BookletDeliveryUsers>,
  ) {}

  async findAll(organizationId: string): Promise<BookletDeliveryUsers[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<BookletDeliveryUsers | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
