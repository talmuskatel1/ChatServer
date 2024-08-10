import { Controller, Post, Body, Get, Param, InternalServerErrorException, Put } from '@nestjs/common';
import { GroupService } from './group.service';

@Controller('groups')
export class GroupController {
  constructor(private groupService: GroupService) {}

  @Post('create')
  async createGroup(@Body() createGroupDto: { name: string; creatorId: string }) {
    return this.groupService.create(createGroupDto.name, createGroupDto.creatorId);
  }

  @Post('join')
  async joinGroup(@Body() joinGroupDto: { userId: string; groupName: string }) {
    return this.groupService.joinGroup(joinGroupDto.userId, joinGroupDto.groupName);
  }

  @Get('user/:userId')
  async getUserGroups(@Param('userId') userId: string) {
    return this.groupService.getUserGroups(userId);
  }

  @Get(':id')
  async getGroup(@Param('id') id: string) {
    return this.groupService.findById(id);
  }

  @Put(':id/group-picture')
async updateGroupPicture(@Param('id') groupId: string, @Body('groupPictureUrl') groupPictureUrl: string) {
  try {
    const updatedGroup = await this.groupService.updateGroupPicture(groupId, groupPictureUrl);
    return updatedGroup;
  } catch (error) {
    console.error('Error updating group picture:', error);
  }
}

@Put(':id/leave')
async leaveGroup(@Param('id') groupId: string, @Body('userId') userId: string) {
  return this.groupService.leaveGroup(userId, groupId);
}
}
