import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatChannelLabels } from '../entities/chat_channel_labels.entity';
import { UpdateChatChannelLabelsDto } from '../dto/update-chat_channel_labels.dto';

@Injectable()
export class UpdateChatChannelLabelsService {
  constructor(
    @InjectRepository(ChatChannelLabels)
    private readonly repository: Repository<ChatChannelLabels>,
  ) {}

  async execute(id: string, dto: UpdateChatChannelLabelsDto, organizationId: string): Promise<ChatChannelLabels> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
