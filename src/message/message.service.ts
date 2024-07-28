import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Message, MessageDocument } from './message.model';
import { Group, GroupDocument } from 'src/group/group.model';
@Injectable()
export class MessageService {
  constructor(
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    @InjectModel(Group.name) private groupModel: Model<GroupDocument>
  ) {}

  async create(senderId: string, groupId: string, content: string): Promise<Message> {
    const group = await this.groupModel.findById(groupId);
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const newMessage = new this.messageModel({
      senderId,
      groupId,
      content,
    });

    const savedMessage = await newMessage.save();
    
    await this.groupModel.findByIdAndUpdate(groupId, {
      $push: { messages: savedMessage._id }
    });

    return savedMessage;
  }

  async getGroupMessages(groupId: string): Promise<Message[]> {
    const group = await this.groupModel.findById(groupId).exec();
    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const messages = await this.messageModel.find({
      _id: { $in: group.messages }
    }).exec();

    return messages;
  }

}