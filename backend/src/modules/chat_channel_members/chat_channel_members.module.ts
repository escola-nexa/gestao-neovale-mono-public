import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatChannelMembers } from './entities/chat_channel_members.entity';
import { ChatChannelMembersController } from './controllers/chat_channel_members.controller';
import { FindChatChannelMembersService } from './services/find-chat_channel_members.service';
import { CreateChatChannelMembersService } from './services/create-chat_channel_members.service';
import { UpdateChatChannelMembersService } from './services/update-chat_channel_members.service';
import { DeleteChatChannelMembersService } from './services/delete-chat_channel_members.service';

@Module({
  imports: [TypeOrmModule.forFeature([ChatChannelMembers])],
  controllers: [ChatChannelMembersController],
  providers: [
    FindChatChannelMembersService,
    CreateChatChannelMembersService,
    UpdateChatChannelMembersService,
    DeleteChatChannelMembersService,
  ],
  exports: [FindChatChannelMembersService],
})
export class ChatChannelMembersModule {}
