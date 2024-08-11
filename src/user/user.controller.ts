import { Controller, Post, Body, HttpException, HttpStatus, Get, Param, InternalServerErrorException, Delete, NotFoundException, Put } from '@nestjs/common';
import { UserService } from './user.service';
import { UserDocument } from './user.model';

@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

  @Post('signup')
  async signup(@Body() signupData: { username: string; password: string }): Promise<{ userId: string; username: string }> {
    try {
      const user: UserDocument = await this.userService.create(signupData.username, signupData.password);
      return { userId: user._id.toString(), username: user.username };
    } catch (error) {
      throw new HttpException('Username already exists', HttpStatus.BAD_REQUEST);
    }
  }


  @Post('login')
  async login(@Body() loginData: { username: string; password: string }): Promise<{ userId: string; username: string }> {
    try {
      const user: UserDocument | null = await this.userService.validateUser(loginData.username, loginData.password);
      if (user) {
        return { userId: user._id.toString(), username: user.username };
      } else {
        throw new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED);
      }
    } catch (error) {
      console.error('Login error:', error);
      throw new InternalServerErrorException('An error occurred during login');
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
    async updateProfilePicture(@Param('id') userId: string, @Body('profilePictureUrl') profilePictureUrl: string) {
      return this.userService.updateProfilePicture(userId, profilePictureUrl);
    }

    @Get(':id/profile-picture')
    async getProfilePicture(@Param('id') userId: string) {
      return this.userService.getUserProfilePicture(userId);
    }
  }