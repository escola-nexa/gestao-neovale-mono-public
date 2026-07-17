import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HelpTutorialViews } from '../entities/help_tutorial_views.entity';

@Injectable()
export class FindHelpTutorialViewsService {
  constructor(
    @InjectRepository(HelpTutorialViews)
    private readonly repository: Repository<HelpTutorialViews>,
  ) {}

  async findAll(organizationId: string): Promise<HelpTutorialViews[]> {
    return this.repository.find({ where: { organizationId } as any });
  }

  async findOne(id: string, organizationId: string): Promise<HelpTutorialViews | null> {
    return this.repository.findOne({ where: { id, organizationId } as any });
  }
}
