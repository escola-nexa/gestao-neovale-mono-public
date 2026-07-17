import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HelpTutorialViews } from '../entities/help_tutorial_views.entity';

@Injectable()
export class DeleteHelpTutorialViewsService {
  constructor(
    @InjectRepository(HelpTutorialViews)
    private readonly repository: Repository<HelpTutorialViews>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
