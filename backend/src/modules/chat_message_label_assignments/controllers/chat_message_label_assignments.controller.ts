import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateChatMessageLabelAssignmentsDto } from '../dto/create-chat_message_label_assignments.dto';
import { UpdateChatMessageLabelAssignmentsDto } from '../dto/update-chat_message_label_assignments.dto';
import { FindChatMessageLabelAssignmentsService } from '../services/find-chat_message_label_assignments.service';
import { CreateChatMessageLabelAssignmentsService } from '../services/create-chat_message_label_assignments.service';
import { UpdateChatMessageLabelAssignmentsService } from '../services/update-chat_message_label_assignments.service';
import { DeleteChatMessageLabelAssignmentsService } from '../services/delete-chat_message_label_assignments.service';

@Controller('chat-message-label-assignments')
@UseGuards(JwtAuthGuard)
export class ChatMessageLabelAssignmentsController {
  constructor(
    private readonly findService: FindChatMessageLabelAssignmentsService,
    private readonly createService: CreateChatMessageLabelAssignmentsService,
    private readonly updateService: UpdateChatMessageLabelAssignmentsService,
    private readonly deleteService: DeleteChatMessageLabelAssignmentsService,
  ) {}

  @Get()
  async findAll(@CurrentUser() user: any) {
    return this.findService.findAll(user.organizationId || user.id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.findService.findOne(id, user.organizationId || user.id);
  }

  @Post()
  async create(@Body() dto: CreateChatMessageLabelAssignmentsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateChatMessageLabelAssignmentsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
