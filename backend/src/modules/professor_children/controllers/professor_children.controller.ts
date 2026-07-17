import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateProfessorChildrenDto } from '../dto/create-professor_children.dto';
import { UpdateProfessorChildrenDto } from '../dto/update-professor_children.dto';
import { FindProfessorChildrenService } from '../services/find-professor_children.service';
import { CreateProfessorChildrenService } from '../services/create-professor_children.service';
import { UpdateProfessorChildrenService } from '../services/update-professor_children.service';
import { DeleteProfessorChildrenService } from '../services/delete-professor_children.service';

@Controller('professor-children')
@UseGuards(JwtAuthGuard)
export class ProfessorChildrenController {
  constructor(
    private readonly findService: FindProfessorChildrenService,
    private readonly createService: CreateProfessorChildrenService,
    private readonly updateService: UpdateProfessorChildrenService,
    private readonly deleteService: DeleteProfessorChildrenService,
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
  async create(@Body() dto: CreateProfessorChildrenDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateProfessorChildrenDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
