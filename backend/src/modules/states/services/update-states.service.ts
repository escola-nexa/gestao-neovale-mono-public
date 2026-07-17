import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { States } from '../entities/states.entity';
import { UpdateStatesDto } from '../dto/update-states.dto';

@Injectable()
export class UpdateStatesService {
  constructor(
    @InjectRepository(States)
    private readonly repository: Repository<States>,
  ) {}

  async execute(id: string, dto: UpdateStatesDto, organizationId: string): Promise<States> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
