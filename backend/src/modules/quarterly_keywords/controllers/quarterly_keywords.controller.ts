import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateQuarterlyKeywordsDto } from '../dto/create-quarterly_keywords.dto';
import { UpdateQuarterlyKeywordsDto } from '../dto/update-quarterly_keywords.dto';
import { FindQuarterlyKeywordsService } from '../services/find-quarterly_keywords.service';
import { CreateQuarterlyKeywordsService } from '../services/create-quarterly_keywords.service';
import { UpdateQuarterlyKeywordsService } from '../services/update-quarterly_keywords.service';
import { DeleteQuarterlyKeywordsService } from '../services/delete-quarterly_keywords.service';

@Controller('quarterly-keywords')
@UseGuards(JwtAuthGuard)
export class QuarterlyKeywordsController {
  constructor(
    private readonly findService: FindQuarterlyKeywordsService,
    private readonly createService: CreateQuarterlyKeywordsService,
    private readonly updateService: UpdateQuarterlyKeywordsService,
    private readonly deleteService: DeleteQuarterlyKeywordsService,
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
  async create(@Body() dto: CreateQuarterlyKeywordsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateQuarterlyKeywordsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
