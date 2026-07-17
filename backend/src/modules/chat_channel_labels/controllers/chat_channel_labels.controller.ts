import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateChatChannelLabelsDto } from '../dto/create-chat_channel_labels.dto';
import { UpdateChatChannelLabelsDto } from '../dto/update-chat_channel_labels.dto';
import { FindChatChannelLabelsService } from '../services/find-chat_channel_labels.service';
import { CreateChatChannelLabelsService } from '../services/create-chat_channel_labels.service';
import { UpdateChatChannelLabelsService } from '../services/update-chat_channel_labels.service';
import { DeleteChatChannelLabelsService } from '../services/delete-chat_channel_labels.service';

@Controller('chat-channel-labels')
@UseGuards(JwtAuthGuard)
export class ChatChannelLabelsController {
  constructor(
    private readonly findService: FindChatChannelLabelsService,
    private readonly createService: CreateChatChannelLabelsService,
    private readonly updateService: UpdateChatChannelLabelsService,
    private readonly deleteService: DeleteChatChannelLabelsService,
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
  async create(@Body() dto: CreateChatChannelLabelsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateChatChannelLabelsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
