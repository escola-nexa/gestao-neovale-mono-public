import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubstitutionStatusHistory } from '../entities/substitution_status_history.entity';
import { UpdateSubstitutionStatusHistoryDto } from '../dto/update-substitution_status_history.dto';

@Injectable()
export class UpdateSubstitutionStatusHistoryService {
  constructor(
    @InjectRepository(SubstitutionStatusHistory)
    private readonly repository: Repository<SubstitutionStatusHistory>,
  ) {}

  async execute(id: string, dto: UpdateSubstitutionStatusHistoryDto, organizationId: string): Promise<SubstitutionStatusHistory> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
