import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HelpTutorials } from '../entities/help_tutorials.entity';

@Injectable()
export class DeleteHelpTutorialsService {
  constructor(
    @InjectRepository(HelpTutorials)
    private readonly repository: Repository<HelpTutorials>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
