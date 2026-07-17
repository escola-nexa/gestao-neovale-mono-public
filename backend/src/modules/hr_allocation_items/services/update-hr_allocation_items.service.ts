import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HrAllocationItems } from '../entities/hr_allocation_items.entity';
import { UpdateHrAllocationItemsDto } from '../dto/update-hr_allocation_items.dto';

@Injectable()
export class UpdateHrAllocationItemsService {
  constructor(
    @InjectRepository(HrAllocationItems)
    private readonly repository: Repository<HrAllocationItems>,
  ) {}

  async execute(id: string, dto: UpdateHrAllocationItemsDto, organizationId: string): Promise<HrAllocationItems> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
