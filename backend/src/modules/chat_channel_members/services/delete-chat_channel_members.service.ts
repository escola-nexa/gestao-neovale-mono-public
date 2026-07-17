import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatChannelMembers } from '../entities/chat_channel_members.entity';

@Injectable()
export class DeleteChatChannelMembersService {
  constructor(
    @InjectRepository(ChatChannelMembers)
    private readonly repository: Repository<ChatChannelMembers>,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    await this.repository.remove(record);
  }
}
