import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatUserInboxState } from '../entities/chat_user_inbox_state.entity';
import { UpdateChatUserInboxStateDto } from '../dto/update-chat_user_inbox_state.dto';

@Injectable()
export class UpdateChatUserInboxStateService {
  constructor(
    @InjectRepository(ChatUserInboxState)
    private readonly repository: Repository<ChatUserInboxState>,
  ) {}

  async execute(id: string, dto: UpdateChatUserInboxStateDto, organizationId: string): Promise<ChatUserInboxState> {
    const record = await this.repository.findOne({ where: { id, organizationId } as any });
    if (!record) {
      throw new NotFoundException('Record not found');
    }
    Object.assign(record, dto);
    return await this.repository.save(record as any);
  }
}
