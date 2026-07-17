import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatChannelMembers } from '../entities/chat_channel_members.entity';
import { CreateChatChannelMembersDto } from '../dto/create-chat_channel_members.dto';

@Injectable()
export class CreateChatChannelMembersService {
  constructor(
    @InjectRepository(ChatChannelMembers)
    private readonly repository: Repository<ChatChannelMembers>,
  ) {}

  async execute(dto: CreateChatChannelMembersDto, organizationId: string): Promise<ChatChannelMembers> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
