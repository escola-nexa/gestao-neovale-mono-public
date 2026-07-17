import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Students } from '../entities/students.entity';
import { UpdateStudentsDto } from '../dto/update-students.dto';

@Injectable()
export class UpdateStudentsService {
  constructor(
    @InjectRepository(Students)
    private readonly repository: Repository<Students>,
  ) {}

  async execute(id: string, dto: UpdateStudentsDto, organizationId: string): Promise<Students> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
