import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatMessageLabelAssignments } from './entities/chat_message_label_assignments.entity';
import { ChatMessageLabelAssignmentsController } from './controllers/chat_message_label_assignments.controller';
import { FindChatMessageLabelAssignmentsService } from './services/find-chat_message_label_assignments.service';
import { CreateChatMessageLabelAssignmentsService } from './services/create-chat_message_label_assignments.service';
import { UpdateChatMessageLabelAssignmentsService } from './services/update-chat_message_label_assignments.service';
import { DeleteChatMessageLabelAssignmentsService } from './services/delete-chat_message_label_assignments.service';

@Module({
  imports: [TypeOrmModule.forFeature([ChatMessageLabelAssignments])],
  controllers: [ChatMessageLabelAssignmentsController],
  providers: [
    FindChatMessageLabelAssignmentsService,
    CreateChatMessageLabelAssignmentsService,
    UpdateChatMessageLabelAssignmentsService,
    DeleteChatMessageLabelAssignmentsService,
  ],
  exports: [FindChatMessageLabelAssignmentsService],
})
export class ChatMessageLabelAssignmentsModule {}
