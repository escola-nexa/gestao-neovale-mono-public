import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateTicketWatchersDto } from '../dto/create-ticket_watchers.dto';
import { UpdateTicketWatchersDto } from '../dto/update-ticket_watchers.dto';
import { FindTicketWatchersService } from '../services/find-ticket_watchers.service';
import { CreateTicketWatchersService } from '../services/create-ticket_watchers.service';
import { UpdateTicketWatchersService } from '../services/update-ticket_watchers.service';
import { DeleteTicketWatchersService } from '../services/delete-ticket_watchers.service';

@Controller('ticket-watchers')
@UseGuards(JwtAuthGuard)
export class TicketWatchersController {
  constructor(
    private readonly findService: FindTicketWatchersService,
    private readonly createService: CreateTicketWatchersService,
    private readonly updateService: UpdateTicketWatchersService,
    private readonly deleteService: DeleteTicketWatchersService,
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
  async create(@Body() dto: CreateTicketWatchersDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateTicketWatchersDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
