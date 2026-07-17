import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HelpTutorials } from '../entities/help_tutorials.entity';

@Injectable()
export class FindHelpTutorialsService {
  constructor(
    @InjectRepository(HelpTutorials)
    private readonly repository: Repository<HelpTutorials>,
  ) {}

  async findAll(organizationId: string): Promise<HelpTutorials[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<HelpTutorials | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
