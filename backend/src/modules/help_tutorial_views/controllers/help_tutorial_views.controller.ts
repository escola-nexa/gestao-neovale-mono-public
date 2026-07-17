import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateHelpTutorialViewsDto } from '../dto/create-help_tutorial_views.dto';
import { UpdateHelpTutorialViewsDto } from '../dto/update-help_tutorial_views.dto';
import { FindHelpTutorialViewsService } from '../services/find-help_tutorial_views.service';
import { CreateHelpTutorialViewsService } from '../services/create-help_tutorial_views.service';
import { UpdateHelpTutorialViewsService } from '../services/update-help_tutorial_views.service';
import { DeleteHelpTutorialViewsService } from '../services/delete-help_tutorial_views.service';

@Controller('help-tutorial-views')
@UseGuards(JwtAuthGuard)
export class HelpTutorialViewsController {
  constructor(
    private readonly findService: FindHelpTutorialViewsService,
    private readonly createService: CreateHelpTutorialViewsService,
    private readonly updateService: UpdateHelpTutorialViewsService,
    private readonly deleteService: DeleteHelpTutorialViewsService,
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
  async create(@Body() dto: CreateHelpTutorialViewsDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateHelpTutorialViewsDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
