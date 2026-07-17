import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatChannelLabelAssignments } from './entities/chat_channel_label_assignments.entity';
import { ChatChannelLabelAssignmentsController } from './controllers/chat_channel_label_assignments.controller';
import { FindChatChannelLabelAssignmentsService } from './services/find-chat_channel_label_assignments.service';
import { CreateChatChannelLabelAssignmentsService } from './services/create-chat_channel_label_assignments.service';
import { UpdateChatChannelLabelAssignmentsService } from './services/update-chat_channel_label_assignments.service';
import { DeleteChatChannelLabelAssignmentsService } from './services/delete-chat_channel_label_assignments.service';

@Module({
  imports: [TypeOrmModule.forFeature([ChatChannelLabelAssignments])],
  controllers: [ChatChannelLabelAssignmentsController],
  providers: [
    FindChatChannelLabelAssignmentsService,
    CreateChatChannelLabelAssignmentsService,
    UpdateChatChannelLabelAssignmentsService,
    DeleteChatChannelLabelAssignmentsService,
  ],
  exports: [FindChatChannelLabelAssignmentsService],
})
export class ChatChannelLabelAssignmentsModule {}
