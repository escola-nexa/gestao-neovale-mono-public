import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organizations } from '../entities/organizations.entity';
import { UpdateOrganizationsDto } from '../dto/update-organizations.dto';

@Injectable()
export class UpdateOrganizationsService {
  constructor(
    @InjectRepository(Organizations)
    private readonly repository: Repository<Organizations>,
  ) {}

  async execute(id: string, dto: UpdateOrganizationsDto, organizationId: string): Promise<Organizations> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
