import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LessonMaterials } from '../entities/lesson_materials.entity';

@Injectable()
export class FindLessonMaterialsService {
  constructor(
    @InjectRepository(LessonMaterials)
    private readonly repository: Repository<LessonMaterials>,
  ) {}

  async findAll(organizationId: string): Promise<LessonMaterials[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<LessonMaterials | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
