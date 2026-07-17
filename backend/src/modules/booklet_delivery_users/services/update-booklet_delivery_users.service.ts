import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookletDeliveryUsers } from '../entities/booklet_delivery_users.entity';
import { UpdateBookletDeliveryUsersDto } from '../dto/update-booklet_delivery_users.dto';

@Injectable()
export class UpdateBookletDeliveryUsersService {
  constructor(
    @InjectRepository(BookletDeliveryUsers)
    private readonly repository: Repository<BookletDeliveryUsers>,
  ) {}

  async execute(id: string, dto: UpdateBookletDeliveryUsersDto, organizationId: string): Promise<BookletDeliveryUsers> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
