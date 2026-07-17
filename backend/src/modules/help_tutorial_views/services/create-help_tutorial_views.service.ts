import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HelpTutorialViews } from '../entities/help_tutorial_views.entity';
import { CreateHelpTutorialViewsDto } from '../dto/create-help_tutorial_views.dto';

@Injectable()
export class CreateHelpTutorialViewsService {
  constructor(
    @InjectRepository(HelpTutorialViews)
    private readonly repository: Repository<HelpTutorialViews>,
  ) {}

  async execute(dto: CreateHelpTutorialViewsDto, organizationId: string): Promise<HelpTutorialViews> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
