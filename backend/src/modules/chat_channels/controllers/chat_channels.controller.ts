import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateChatChannelsDto } from '../dto/create-chat_channels.dto';
import { UpdateChatChannelsDto } from '../dto/update-chat_channels.dto';
import { FindChatChannelsService } from '../services/find-chat_channels.service';
import { CreateChatChannelsService } from '../services/create-chat_channels.service';
import { UpdateChatChannelsService } from '../services/update-chat_channels.service';
import { DeleteChatChannelsService } from '../services/delete-chat_channels.service';

@Controller('chat-channels')
@UseGuards(JwtAuthGuard)
export class ChatChannelsController {
  constructor(
    private readonly findService: FindChatChannelsService,
    private readonly createService: CreateChatChannelsService,
    private readonly updateService: UpdateChatChannelsService,
    private readonly deleteService: DeleteChatChannelsService,
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
  async create(@Body() dto: CreateChatChannelsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateChatChannelsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
