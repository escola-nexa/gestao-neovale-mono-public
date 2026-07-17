import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HelpTutorialViews } from '../entities/help_tutorial_views.entity';
import { UpdateHelpTutorialViewsDto } from '../dto/update-help_tutorial_views.dto';

@Injectable()
export class UpdateHelpTutorialViewsService {
  constructor(
    @InjectRepository(HelpTutorialViews)
    private readonly repository: Repository<HelpTutorialViews>,
  ) {}

  async execute(id: string, dto: UpdateHelpTutorialViewsDto, organizationId: string): Promise<HelpTutorialViews> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
