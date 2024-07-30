import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Group, GroupDocument } from './group.model';
import { User, UserDocument } from '../user/user.model';
import { UserService } from 'src/user/user.service';

@Injectable()
export class GroupService {
  constructor(@InjectModel(Group.name) private groupModel: Model<GroupDocument>,
  @InjectModel(User.name) private userModel: Model<UserDocument>,
  private userService: UserService

) {}

async create(name: string, creatorId: string): Promise<GroupDocument> {
  const newGroup = new this.groupModel({ 
    name, 
    members: [new Types.ObjectId(creatorId)]
  });
  const savedGroup = await newGroup.save();
  await this.userModel.findByIdAndUpdate(
    creatorId,
    { $push: { groups: savedGroup._id } }
  );
  return savedGroup;
}

async isMember(groupId: string, userId: string): Promise<boolean> {
  const group = await this.groupModel.findById(groupId).exec();
  if (!group) {
    throw new NotFoundException(`Group with id ${groupId} not found`);
  }
  return group.members.some(memberId => memberId.toString() === userId);
}
async addMember(groupId: string, userId: string): Promise<Group> {
  const group = await this.groupModel.findByIdAndUpdate(
    groupId,
    { $addToSet: { members: new Types.ObjectId(userId) } },
    { new: true }
  ).exec();

  if (!group) {
    throw new NotFoundException(`Group with id ${groupId} not found`);
  }

  await this.userModel.findByIdAndUpdate(
    userId,
    { $addToSet: { groups: group._id } }
  ).exec();

  return group;
}

  async findByName(name: string): Promise<GroupDocument | null> {
    return this.groupModel.findOne({ name }).exec();
  }

  async getUserGroups(userId: string): Promise<Group[]> {
    const user = await this.userModel.findById(userId).populate('groups').exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    
    if (user.groups.length > 0 && typeof user.groups[0] !== 'string' && 'name' in user.groups[0]) {
      return user.groups as Group[];
    } else {
      const groupIds = user.groups as Types.ObjectId[];
      return this.groupModel.find({ _id: { $in: groupIds } }).exec();
    }
  }
  
  
  
  async joinGroup(userId: string, groupName: string): Promise<Group> {
    const group = await this.findByName(groupName);
    if (!group) {
      throw new NotFoundException(`Group with name ${groupName} not found`);
    }
    
    const isMember = await this.isMember(group._id.toString(), userId);
    if (!isMember) {
      return this.addMember(group._id.toString(), userId);
    }

    return group;
  }

  async updateGroupPicture(groupId: string, groupPictureUrl: string): Promise<Group> {
    console.log(`Updating group picture for group ${groupId} with URL ${groupPictureUrl}`);
    const updatedGroup = await this.groupModel.findByIdAndUpdate(
      groupId,
      { $set: { groupPicture: groupPictureUrl } },
      { new: true, select: '+groupPicture' }
    ).exec();
  
    if (!updatedGroup) {
      throw new NotFoundException(`Group with id ${groupId} not found`);
    }
  
    console.log('Updated group:', JSON.stringify(updatedGroup, null, 2));
    return updatedGroup;
  }

  async leaveGroup(userId: string, groupId: string): Promise<Group> {
    const group = await this.groupModel.findByIdAndUpdate(
      groupId,
      { $pull: { members: userId } },
      { new: true }
    ).exec();

    if (!group) {
      throw new NotFoundException(`Group with id ${groupId} not found`);
    }

    await this.userService.removeGroup(userId, groupId);

    return group;
  }



  async addMessage(groupId: string, messageId: string): Promise<Group> {
    return this.groupModel.findByIdAndUpdate(
      groupId,
      { $push: { messages: messageId } },
      { new: true }
    ).exec();
  }

  async getMembers(groupId: string): Promise<string[]> {
    const group = await this.groupModel.findById(groupId).exec();
    if (!group) {
      throw new NotFoundException(`Group with id ${groupId} not found`);
    }
    return group.members.map(member => member.toString());
  }

  async removeMember(groupId: string, userId: string): Promise<Group> {
    const group = await this.groupModel.findById(groupId);
    if (!group) {
      throw new NotFoundException(`Group with id ${groupId} not found`);
    }

    const updatedGroup = await this.groupModel.findByIdAndUpdate(
      groupId,
      { $pull: { members: new Types.ObjectId(userId) } },
      { new: true }
    ).exec();

    if (!updatedGroup) {
      throw new NotFoundException(`Group with id ${groupId} not found`);
    }

    return updatedGroup;
  }

  async deleteGroup(groupId: string): Promise<void> {
    const result = await this.groupModel.deleteOne({ _id: groupId }).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException(`Group with id ${groupId} not found`);
    }
  }

  async findById(id: string): Promise<Group> {
    const group = await this.groupModel.findById(id).exec();
    if (!group) {
      throw new NotFoundException(`Group with id ${id} not found`);
    }
    return group;
  }

}