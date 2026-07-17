import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClassGroups } from '../entities/class_groups.entity';
import { CreateClassGroupsDto } from '../dto/create-class_groups.dto';

@Injectable()
export class CreateClassGroupsService {
  constructor(
    @InjectRepository(ClassGroups)
    private readonly repository: Repository<ClassGroups>,
  ) {}

  async execute(dto: CreateClassGroupsDto, organizationId: string): Promise<ClassGroups> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
