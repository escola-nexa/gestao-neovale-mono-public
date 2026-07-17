import { PartialType } from '@nestjs/mapped-types';
import { CreateChatMessageLabelAssignmentsDto } from './create-chat_message_label_assignments.dto';

export class UpdateChatMessageLabelAssignmentsDto extends PartialType(CreateChatMessageLabelAssignmentsDto) {}
