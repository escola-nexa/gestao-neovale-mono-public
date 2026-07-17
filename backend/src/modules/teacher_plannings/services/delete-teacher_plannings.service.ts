import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TeacherPlannings } from '../entities/teacher_plannings.entity';

@Injectable()
export class DeleteTeacherPlanningsService {
  constructor(
    @InjectRepository(TeacherPlannings)
    private readonly repository: Repository<TeacherPlannings>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
