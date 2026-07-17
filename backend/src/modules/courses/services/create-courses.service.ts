import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Courses } from '../entities/courses.entity';
import { CreateCoursesDto } from '../dto/create-courses.dto';

@Injectable()
export class CreateCoursesService {
  constructor(
    @InjectRepository(Courses)
    private readonly repository: Repository<Courses>,
  ) {}

  async execute(dto: CreateCoursesDto, organizationId: string): Promise<Courses> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
