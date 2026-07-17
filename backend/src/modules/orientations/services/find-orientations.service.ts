import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Orientations } from '../entities/orientations.entity';

@Injectable()
export class FindOrientationsService {
  constructor(
    @InjectRepository(Orientations)
    private readonly repository: Repository<Orientations>,
  ) {}

  async findAll(organizationId: string): Promise<Orientations[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<Orientations | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
