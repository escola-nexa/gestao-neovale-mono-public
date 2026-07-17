import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateUserRolesDto } from '../dto/create-user_roles.dto';
import { UpdateUserRolesDto } from '../dto/update-user_roles.dto';
import { FindUserRolesService } from '../services/find-user_roles.service';
import { CreateUserRolesService } from '../services/create-user_roles.service';
import { UpdateUserRolesService } from '../services/update-user_roles.service';
import { DeleteUserRolesService } from '../services/delete-user_roles.service';

@Controller('user-roles')
@UseGuards(JwtAuthGuard)
export class UserRolesController {
  constructor(
    private readonly findService: FindUserRolesService,
    private readonly createService: CreateUserRolesService,
    private readonly updateService: UpdateUserRolesService,
    private readonly deleteService: DeleteUserRolesService,
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
  async create(@Body() dto: CreateUserRolesDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateUserRolesDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
