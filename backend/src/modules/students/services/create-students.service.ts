import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Students } from '../entities/students.entity';
import { CreateStudentsDto } from '../dto/create-students.dto';

@Injectable()
export class CreateStudentsService {
  constructor(
    @InjectRepository(Students)
    private readonly repository: Repository<Students>,
  ) {}

  async execute(dto: CreateStudentsDto, organizationId: string): Promise<Students> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
