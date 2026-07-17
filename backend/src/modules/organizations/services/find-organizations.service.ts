import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organizations } from '../entities/organizations.entity';

@Injectable()
export class FindOrganizationsService {
  constructor(
    @InjectRepository(Organizations)
    private readonly repository: Repository<Organizations>,
  ) {}

  async findAll(): Promise<Organizations[]> {
    return this.repository.find();
  }

  async findOne(id: string): Promise<Organizations | null> {
    return this.repository.findOne({ where: { id } });
  }
}
