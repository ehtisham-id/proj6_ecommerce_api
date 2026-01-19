import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import * as bcrypt from 'bcryptjs';
import { AuditLoggerService } from '@common/audit/audit-logger.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private auditLogger: AuditLoggerService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.userRepository.findOne({ where: { email: createUserDto.email } });
    if (existingUser) {
      throw new BadRequestException('Email already exists');
    }

    const user = this.userRepository.create(createUserDto);
    const savedUser = await this.userRepository.save(user);
    
    await this.auditLogger.log('user.created', { userId: savedUser.id, adminId: null });
    return savedUser;
  }

  async findAll(page = 1, limit = 10): Promise<{ users: User[]; total: number; page: number; limit: number }> {
    const [users, total] = await this.userRepository.findAndCount({
      where: { isActive: true, deletedAt: null },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { users, total, page, limit };
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ 
      where: { id, isActive: true, deletedAt: null } 
    });
    
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findByIdForSelf(id: string, currentUserId: string): Promise<User> {
    if (id !== currentUserId) {
      throw new ForbiddenException('Cannot access other user data');
    }
    return this.findOne(id);
  }

  async update(id: string, updateUserDto: UpdateUserDto, currentUserId?: string): Promise<User> {
    const user = await this.findOne(id);
    
    // Self-update restriction
    if (currentUserId && id !== currentUserId && user.role !== 'ADMIN') {
      throw new ForbiddenException('Only admins can update other users');
    }

    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 12);
    }

    Object.assign(user, updateUserDto);
    const updatedUser = await this.userRepository.save(user);
    
    await this.auditLogger.log('user.updated', { 
      userId: id, 
      adminId: currentUserId || null,
      changes: Object.keys(updateUserDto)
    });
    
    return updatedUser;
  }

  async updateRole(id: string, updateRoleDto: UpdateRoleDto, adminId: string): Promise<User> {
    const user = await this.findOne(id);
    
    if (user.role === 'ADMIN' && adminId !== id) {
      throw new ForbiddenException('Cannot change admin role');
    }

    user.role = updateRoleDto.role;
    const updatedUser = await this.userRepository.save(user);
    
    await this.auditLogger.log('user.role.updated', { 
      userId: id, 
      adminId,
      newRole: updateRoleDto.role 
    });
    
    return updatedUser;
  }

  async softDelete(id: string, adminId?: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.userRepository.softDelete(id);
    await this.auditLogger.log('user.deleted', { userId: id, adminId });
  }
}
