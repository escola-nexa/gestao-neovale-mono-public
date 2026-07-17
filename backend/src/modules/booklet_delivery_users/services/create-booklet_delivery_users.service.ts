import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookletDeliveryUsers } from '../entities/booklet_delivery_users.entity';
import { CreateBookletDeliveryUsersDto } from '../dto/create-booklet_delivery_users.dto';

@Injectable()
export class CreateBookletDeliveryUsersService {
  constructor(
    @InjectRepository(BookletDeliveryUsers)
    private readonly repository: Repository<BookletDeliveryUsers>,
  ) {}

  async execute(dto: CreateBookletDeliveryUsersDto, organizationId: string): Promise<BookletDeliveryUsers> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
