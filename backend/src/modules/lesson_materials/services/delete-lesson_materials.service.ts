import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LessonMaterials } from '../entities/lesson_materials.entity';

@Injectable()
export class DeleteLessonMaterialsService {
  constructor(
    @InjectRepository(LessonMaterials)
    private readonly repository: Repository<LessonMaterials>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
