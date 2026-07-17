import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { CreateProfilesDto } from '../dto/create-profiles.dto';
import { UpdateProfilesDto } from '../dto/update-profiles.dto';
import { FindProfilesService } from '../services/find-profiles.service';
import { CreateProfilesService } from '../services/create-profiles.service';
import { UpdateProfilesService } from '../services/update-profiles.service';
import { DeleteProfilesService } from '../services/delete-profiles.service';

@Controller(['profiles', 'users'])
@UseGuards(JwtAuthGuard)
export class ProfilesController {
  constructor(
    private readonly findService: FindProfilesService,
    private readonly createService: CreateProfilesService,
    private readonly updateService: UpdateProfilesService,
    private readonly deleteService: DeleteProfilesService,
  ) {}

  @Get()
  async findAll(@CurrentUser() user: any, @Query('role') role?: string, @Query('organizationId') orgId?: string) {
    if (role && orgId) {
      return this.findService.findByRole(role, orgId);
    }
    return this.findService.findAll(user.organizationId || user.id);
  }

  @Get('staff')
  async getStaffByRoles(@Query('organizationId') organizationId: string, @Query('roles') roles: string) {
    return this.findService.getStaffByRoles(organizationId, roles.split(','));
  }

  @Get('profiles')
  async getProfilesByIds(@Query('ids') ids: string) {
    return this.findService.getProfilesByIds(ids.split(','));
  }

  @Get(':id/role')
  async getUserRole(@Param('id') id: string) {
    return this.findService.getUserRole(id);
  }

  @Get(':id/assigned-tickets')
  async getAssignedTickets(@Param('id') id: string) {
    return this.findService.getAssignedTickets(id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.findService.findOne(id, user.organizationId || user.id);
  }

  @Post()
  async create(@Body() dto: CreateProfilesDto, @CurrentUser() user: any) {
    return this.createService.execute(dto, user.organizationId || user.id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateProfilesDto, @CurrentUser() user: any) {
    return this.updateService.execute(id, dto, user.organizationId || user.id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.deleteService.execute(id, user.organizationId || user.id);
  }
}
