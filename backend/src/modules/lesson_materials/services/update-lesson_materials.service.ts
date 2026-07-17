import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LessonMaterials } from '../entities/lesson_materials.entity';
import { UpdateLessonMaterialsDto } from '../dto/update-lesson_materials.dto';

@Injectable()
export class UpdateLessonMaterialsService {
  constructor(
    @InjectRepository(LessonMaterials)
    private readonly repository: Repository<LessonMaterials>,
  ) {}

  async execute(id: string, dto: UpdateLessonMaterialsDto, organizationId: string): Promise<LessonMaterials> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
