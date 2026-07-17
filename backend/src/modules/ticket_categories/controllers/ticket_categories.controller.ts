import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateTicketCategoriesDto } from '../dto/create-ticket_categories.dto';
import { UpdateTicketCategoriesDto } from '../dto/update-ticket_categories.dto';
import { FindTicketCategoriesService } from '../services/find-ticket_categories.service';
import { CreateTicketCategoriesService } from '../services/create-ticket_categories.service';
import { UpdateTicketCategoriesService } from '../services/update-ticket_categories.service';
import { DeleteTicketCategoriesService } from '../services/delete-ticket_categories.service';

@Controller('ticket-categories')
@UseGuards(JwtAuthGuard)
export class TicketCategoriesController {
  constructor(
    private readonly findService: FindTicketCategoriesService,
    private readonly createService: CreateTicketCategoriesService,
    private readonly updateService: UpdateTicketCategoriesService,
    private readonly deleteService: DeleteTicketCategoriesService,
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
  async create(@Body() dto: CreateTicketCategoriesDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateTicketCategoriesDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
