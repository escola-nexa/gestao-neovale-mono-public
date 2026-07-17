import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatUserInboxState } from '../entities/chat_user_inbox_state.entity';
import { CreateChatUserInboxStateDto } from '../dto/create-chat_user_inbox_state.dto';

@Injectable()
export class CreateChatUserInboxStateService {
  constructor(
    @InjectRepository(ChatUserInboxState)
    private readonly repository: Repository<ChatUserInboxState>,
  ) {}

  async execute(dto: CreateChatUserInboxStateDto, organizationId: string): Promise<ChatUserInboxState> {
    const newRecord = this.repository.create({
      ...dto,
      organizationId,
    } as any);
    return await this.repository.save(newRecord as any);
  }
}
