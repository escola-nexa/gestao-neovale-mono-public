import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HelpTutorials } from '../entities/help_tutorials.entity';
import { CreateHelpTutorialsDto } from '../dto/create-help_tutorials.dto';

@Injectable()
export class CreateHelpTutorialsService {
  constructor(
    @InjectRepository(HelpTutorials)
    private readonly repository: Repository<HelpTutorials>,
  ) {}

  async execute(dto: CreateHelpTutorialsDto, organizationId: string): Promise<HelpTutorials> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
