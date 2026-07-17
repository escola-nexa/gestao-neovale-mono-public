import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HrAllocationItems } from '../entities/hr_allocation_items.entity';
import { CreateHrAllocationItemsDto } from '../dto/create-hr_allocation_items.dto';

@Injectable()
export class CreateHrAllocationItemsService {
  constructor(
    @InjectRepository(HrAllocationItems)
    private readonly repository: Repository<HrAllocationItems>,
  ) {}

  async execute(dto: CreateHrAllocationItemsDto, organizationId: string): Promise<HrAllocationItems> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
