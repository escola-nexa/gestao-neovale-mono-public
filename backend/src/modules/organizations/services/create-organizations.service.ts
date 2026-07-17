import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organizations } from '../entities/organizations.entity';
import { CreateOrganizationsDto } from '../dto/create-organizations.dto';

@Injectable()
export class CreateOrganizationsService {
  constructor(
    @InjectRepository(Organizations)
    private readonly repository: Repository<Organizations>,
  ) {}

  async execute(dto: CreateOrganizationsDto, organizationId: string): Promise<Organizations> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
