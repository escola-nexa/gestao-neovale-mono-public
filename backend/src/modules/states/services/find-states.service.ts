import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { States } from '../entities/states.entity';

@Injectable()
export class FindStatesService {
  constructor(
    @InjectRepository(States)
    private readonly repository: Repository<States>,
  ) {}

  async findAll(organizationId: string): Promise<States[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<States | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
