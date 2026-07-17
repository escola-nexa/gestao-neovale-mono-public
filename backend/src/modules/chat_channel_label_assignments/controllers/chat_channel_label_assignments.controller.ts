import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateChatChannelLabelAssignmentsDto } from '../dto/create-chat_channel_label_assignments.dto';
import { UpdateChatChannelLabelAssignmentsDto } from '../dto/update-chat_channel_label_assignments.dto';
import { FindChatChannelLabelAssignmentsService } from '../services/find-chat_channel_label_assignments.service';
import { CreateChatChannelLabelAssignmentsService } from '../services/create-chat_channel_label_assignments.service';
import { UpdateChatChannelLabelAssignmentsService } from '../services/update-chat_channel_label_assignments.service';
import { DeleteChatChannelLabelAssignmentsService } from '../services/delete-chat_channel_label_assignments.service';

@Controller('chat-channel-label-assignments')
@UseGuards(JwtAuthGuard)
export class ChatChannelLabelAssignmentsController {
  constructor(
    private readonly findService: FindChatChannelLabelAssignmentsService,
    private readonly createService: CreateChatChannelLabelAssignmentsService,
    private readonly updateService: UpdateChatChannelLabelAssignmentsService,
    private readonly deleteService: DeleteChatChannelLabelAssignmentsService,
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
  async create(@Body() dto: CreateChatChannelLabelAssignmentsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateChatChannelLabelAssignmentsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
