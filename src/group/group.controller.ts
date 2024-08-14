import { Controller, Post, Body, Get, Param, InternalServerErrorException, Put, UseInterceptors, UploadedFile } from '@nestjs/common';
import { GroupService } from './group.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { Express } from 'express';
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
  @UseInterceptors(FileInterceptor('image'))
  async updateGroupPicture(
    @Param('id') groupId: string,
    @UploadedFile() file: Express.Multer.File
  ) {
    try {
      return await this.groupService.updateGroupPicture(groupId, file);
    } catch (error) {
      console.error('Error updating group picture:', error);
      throw new InternalServerErrorException('Failed to update group picture');
    }
  }

@Put(':id/leave')
async leaveGroup(@Param('id') groupId: string, @Body('userId') userId: string) {
  return this.groupService.leaveGroup(userId, groupId);
}
}