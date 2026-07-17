import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HelpTutorials } from '../entities/help_tutorials.entity';
import { UpdateHelpTutorialsDto } from '../dto/update-help_tutorials.dto';

@Injectable()
export class UpdateHelpTutorialsService {
  constructor(
    @InjectRepository(HelpTutorials)
    private readonly repository: Repository<HelpTutorials>,
  ) {}

  async execute(id: string, dto: UpdateHelpTutorialsDto, organizationId: string): Promise<HelpTutorials> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
