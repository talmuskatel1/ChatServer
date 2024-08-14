import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Group, GroupDocument } from 'src/group/group.model';
import { User, UserDocument } from '../user/user.model';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
@Injectable()
export class UserService {
 
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Group.name) private groupModel: Model<GroupDocument>
  ) {}

  async validateUser(username: string, password: string): Promise<UserDocument | null> {
    const user = await this.findByUsername(username);
    if (!user) {
      return null;
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return null;
    }
    return user;
  }

  async findByUsername(username: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ username }).exec();
  }

  async create(username: string, password: string): Promise<UserDocument> {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new this.userModel({ username, password: hashedPassword });
    return newUser.save();
  }

  async addGroup(userId: string, groupId: string): Promise<void> {
    const user = await this.userModel.findById(userId);
    if (user && !user.groups.some(id => id.toString() === groupId)) {
      await this.userModel.findByIdAndUpdate(
        userId,
        { $addToSet: { groups: new Types.ObjectId(groupId) } },
        { new: true }
      ).exec();
    }
  }

  async getUserGroups(userId: string): Promise<Group[]> {
    const user = await this.userModel.findById(userId).populate('groups').exec();
    if (!user) {
      throw new NotFoundException(`User with id ${userId} not found`);
    }
    return user.groups as Group[];
  }

  async removeGroup(userId: string, groupId: string): Promise<User> {
    const updatedUser = await this.userModel.findByIdAndUpdate(
      userId,
      { $pull: { groups: new Types.ObjectId(groupId) } },
      { new: true }
    ).exec();
  
    if (!updatedUser) {
      throw new NotFoundException(`User with id ${userId} not found`);
    }
  
    return updatedUser;
  }

  async deleteUser(userId: string): Promise<void> {
    const user = await this.userModel.findByIdAndDelete(userId).exec();
    if (!user) {
      throw new NotFoundException(`User with id ${userId} not found`);
    }
    await this.groupModel.updateMany(
      { members: userId },
      { $pull: { members: userId } }
    ).exec();
  }

  async findUserById(userId: string): Promise<User> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException(`User with id ${userId} not found`);
    }
      return user;
  }

  async updateProfilePicture(userId: string, file: Express.Multer.File): Promise<User> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with id ${userId} not found`);
    }

    if (user.profilePicture) {
      const oldFilePath = path.join(process.cwd(), user.profilePicture);
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
    }

    const fileExtension = path.extname(file.originalname);
    const fileName = `${uuidv4()}${fileExtension}`;
    const filePath = path.join('uploads', 'profile-pictures', fileName);
    const fullPath = path.join(process.cwd(), filePath);

    fs.writeFileSync(fullPath, file.buffer);

    user.profilePicture = filePath;
    return user.save();
  }

  async getUserProfilePicture(userId: string): Promise<{ profilePicture: string | null }> {
    const user = await this.userModel.findById(userId).select('profilePicture').exec();
    if (!user) {
      throw new NotFoundException(`User with id ${userId} not found`);
    }
    return { profilePicture: user.profilePicture || null };
  }

  
}