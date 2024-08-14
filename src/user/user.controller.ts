import { Controller, Post, Body, HttpException, HttpStatus, Get, Param, InternalServerErrorException, Delete, NotFoundException, Put, UseInterceptors, UploadedFile } from '@nestjs/common';
import { UserService } from './user.service';
import { UserDocument } from './user.model';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { FileInterceptor } from '@nestjs/platform-express';
import { Express } from 'express';
@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

  @Post('signup')
  async signup(@Body() signupData: { username: string; password: string }) {
    try {
      const user = await this.userService.create(signupData.username, signupData.password);
      return { 
        userId: user._id.toString(), 
        username: user.username,
        profilePictureUrl: user.profilePicture || null
      };
    } catch (error) {
      console.error('Signup error:', error);
      throw new HttpException(
        error.message || 'Username already exists or invalid data', 
        HttpStatus.BAD_REQUEST
      );
    }
  }


  @Post('login')
  async login(@Body() loginData: { username: string; password: string }) {
    try {
      const user = await this.userService.validateUser(loginData.username, loginData.password);
      if (user) {
        return { 
          userId: user._id.toString(), 
          username: user.username,
          profilePictureUrl: user.profilePicture || null
        };
      } else {
        throw new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED);
      }
    } catch (error) {
      console.error('Login error:', error);
      throw new HttpException(
        error.message || 'An error occurred during login', 
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get(':userId/groups')
  async getUserGroups(@Param('userId') userId: string) {
    try {
      const groups = await this.userService.getUserGroups(userId);
      console.log('Sending groups to client:', groups);
      return groups;
    } catch (error) {
      console.error('Error fetching user groups:', error);
      throw new HttpException('Error fetching user groups', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete(':id')
  async deleteUser(@Param('id') userId: string) {
    try {
      await this.userService.deleteUser(userId);
      return { message: 'User deleted successfully' };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new HttpException(error.message, HttpStatus.NOT_FOUND);
      }
      throw new HttpException('An error occurred while deleting the user', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':id')
  async getUser(@Param('id') userId: string) {
    try {
      const user = await this.userService.findUserById(userId);
      return { username: user.username };
    } catch (error) {
      console.log("error in getUser function in userController", error);
      throw new NotFoundException(`User with id ${userId} not found`);
    }
  }
  @Put(':id/profile-picture')
  @UseInterceptors(FileInterceptor('image'))
  async updateProfilePicture(
    @Param('id') userId: string,
    @UploadedFile() file: Express.Multer.File
  ) {
    try {
      return await this.userService.updateProfilePicture(userId, file);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new HttpException(error.message, HttpStatus.NOT_FOUND);
      }
      throw new InternalServerErrorException('Failed to update profile picture');
    }
  }
  @Get(':id/profile-picture')
  async getProfilePicture(@Param('id') userId: string) {
    try {
      const result = await this.userService.getUserProfilePicture(userId);
      if (!result.profilePicture) {
        throw new NotFoundException('No profile picture found for this user');
      }
      return result;
    } catch (error) {
      console.error(`Error fetching profile picture for user ${userId}:`, error);
      throw error;
    }
  }
  }