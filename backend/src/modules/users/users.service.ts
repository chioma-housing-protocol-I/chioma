import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { User } from './entities/user.entity';
import {
  UpdateProfileDto,
  ChangeEmailDto,
  ChangePasswordDto,
} from './dto/update-user.dto';

const SALT_ROUNDS = 12;

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async updateProfile(
    userId: string,
    updateProfileDto: UpdateProfileDto,
  ): Promise<User> {
    const user = await this.findById(userId);

    Object.assign(user, updateProfileDto);

    const updatedUser = await this.userRepository.save(user);
    this.logger.log(`Profile updated for user: ${user.email}`);

    return updatedUser;
  }

  async changeEmail(
    userId: string,
    changeEmailDto: ChangeEmailDto,
  ): Promise<{ message: string }> {
    const user = await this.findById(userId);

    const isPasswordValid = await bcrypt.compare(
      changeEmailDto.currentPassword,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid password');
    }

    const existingUser = await this.findByEmail(changeEmailDto.newEmail);
    if (existingUser) {
      throw new BadRequestException('Email already in use');
    }

    const verificationToken = randomBytes(32).toString('hex');

    await this.userRepository.update(userId, {
      email: changeEmailDto.newEmail,
      emailVerified: false,
      verificationToken,
    });

    this.logger.log(
      `Email changed for user: ${user.id} from ${user.email} to ${changeEmailDto.newEmail}`,
    );

    return { message: 'Email updated. Please verify your new email address.' };
  }

  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const user = await this.findById(userId);

    const isPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    if (changePasswordDto.currentPassword === changePasswordDto.newPassword) {
      throw new BadRequestException(
        'New password must be different from current password',
      );
    }

    // Validate new password against policy (if PasswordPolicyService is available)
    // Note: This creates a circular dependency, so we'll validate in the controller
    // or use a shared validation utility

    const hashedPassword = await bcrypt.hash(
      changePasswordDto.newPassword,
      SALT_ROUNDS,
    );

    await this.userRepository.update(userId, {
      password: hashedPassword,
      refreshToken: null,
    });

    this.logger.log(`Password changed for user: ${user.email}`);

    return { message: 'Password changed successfully. Please login again.' };
  }

  async deactivateAccount(userId: string): Promise<{ message: string }> {
    const user = await this.findById(userId);

    await this.userRepository.update(userId, {
      isActive: false,
      refreshToken: null,
    });

    this.logger.log(`Account deactivated for user: ${user.email}`);

    return { message: 'Account deactivated successfully' };
  }

  async deleteAccount(userId: string): Promise<{ message: string }> {
    const user = await this.findById(userId);

    await this.userRepository.softDelete(userId);

    this.logger.log(`Account deleted for user: ${user.email}`);

    return { message: 'Account deleted successfully' };
  }

  async getUserActivity(userId: string): Promise<any> {
    const user = await this.findById(userId);

    return {
      lastLogin: user.lastLoginAt,
      accountCreated: user.createdAt,
      emailVerified: user.emailVerified,
      isActive: user.isActive,
    };
  }
}
