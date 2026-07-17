import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Courses } from '../entities/courses.entity';
import { UpdateCoursesDto } from '../dto/update-courses.dto';

@Injectable()
export class UpdateCoursesService {
  constructor(
    @InjectRepository(Courses)
    private readonly repository: Repository<Courses>,
  ) {}

  async execute(id: string, dto: UpdateCoursesDto, organizationId: string): Promise<Courses> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
