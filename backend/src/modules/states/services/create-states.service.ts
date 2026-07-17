import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { States } from '../entities/states.entity';
import { CreateStatesDto } from '../dto/create-states.dto';

@Injectable()
export class CreateStatesService {
  constructor(
    @InjectRepository(States)
    private readonly repository: Repository<States>,
  ) {}

  async execute(dto: CreateStatesDto, organizationId: string): Promise<States> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
