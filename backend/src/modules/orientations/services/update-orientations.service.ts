import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Orientations } from '../entities/orientations.entity';
import { UpdateOrientationsDto } from '../dto/update-orientations.dto';

@Injectable()
export class UpdateOrientationsService {
  constructor(
    @InjectRepository(Orientations)
    private readonly repository: Repository<Orientations>,
  ) {}

  async execute(id: string, dto: UpdateOrientationsDto, organizationId: string): Promise<Orientations> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
