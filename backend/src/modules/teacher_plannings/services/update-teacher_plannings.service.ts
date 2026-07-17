import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeacherPlannings } from '../entities/teacher_plannings.entity';
import { UpdateTeacherPlanningsDto } from '../dto/update-teacher_plannings.dto';

@Injectable()
export class UpdateTeacherPlanningsService {
  constructor(
    @InjectRepository(TeacherPlannings)
    private readonly repository: Repository<TeacherPlannings>,
  ) {}

  async execute(id: string, dto: UpdateTeacherPlanningsDto, organizationId: string): Promise<TeacherPlannings> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
