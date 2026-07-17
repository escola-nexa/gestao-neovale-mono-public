import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateChatChannelMembersDto } from '../dto/create-chat_channel_members.dto';
import { UpdateChatChannelMembersDto } from '../dto/update-chat_channel_members.dto';
import { FindChatChannelMembersService } from '../services/find-chat_channel_members.service';
import { CreateChatChannelMembersService } from '../services/create-chat_channel_members.service';
import { UpdateChatChannelMembersService } from '../services/update-chat_channel_members.service';
import { DeleteChatChannelMembersService } from '../services/delete-chat_channel_members.service';

@Controller('chat-channel-members')
@UseGuards(JwtAuthGuard)
export class ChatChannelMembersController {
  constructor(
    private readonly findService: FindChatChannelMembersService,
    private readonly createService: CreateChatChannelMembersService,
    private readonly updateService: UpdateChatChannelMembersService,
    private readonly deleteService: DeleteChatChannelMembersService,
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
  async create(@Body() dto: CreateChatChannelMembersDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateChatChannelMembersDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
