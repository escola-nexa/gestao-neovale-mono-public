import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LessonMaterials } from '../entities/lesson_materials.entity';
import { CreateLessonMaterialsDto } from '../dto/create-lesson_materials.dto';

@Injectable()
export class CreateLessonMaterialsService {
  constructor(
    @InjectRepository(LessonMaterials)
    private readonly repository: Repository<LessonMaterials>,
  ) {}

  async execute(dto: CreateLessonMaterialsDto, organizationId: string): Promise<LessonMaterials> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
