import { PartialType } from '@nestjs/mapped-types';
import { CreateChatChannelLabelAssignmentsDto } from './create-chat_channel_label_assignments.dto';

export class UpdateChatChannelLabelAssignmentsDto extends PartialType(CreateChatChannelLabelAssignmentsDto) {}
