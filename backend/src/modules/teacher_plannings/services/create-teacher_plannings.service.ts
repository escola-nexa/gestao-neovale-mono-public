import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeacherPlannings } from '../entities/teacher_plannings.entity';
import { CreateTeacherPlanningsDto } from '../dto/create-teacher_plannings.dto';

@Injectable()
export class CreateTeacherPlanningsService {
  constructor(
    @InjectRepository(TeacherPlannings)
    private readonly repository: Repository<TeacherPlannings>,
  ) {}

  async execute(dto: CreateTeacherPlanningsDto, organizationId: string): Promise<TeacherPlannings> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
