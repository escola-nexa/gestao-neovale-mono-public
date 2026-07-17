import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Students } from '../entities/students.entity';

@Injectable()
export class FindStudentsService {
  constructor(
    @InjectRepository(Students)
    private readonly repository: Repository<Students>,
  ) {}

  async findAll(organizationId: string): Promise<Students[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<Students | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
