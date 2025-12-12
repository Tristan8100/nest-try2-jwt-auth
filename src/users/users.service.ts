import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm'; // use MongoRepository for MongoDB
import * as bcrypt from 'bcrypt';
import { ObjectId } from 'mongodb';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: MongoRepository<User>, // changed to MongoRepository
  ) {}

  private async checkEmailExists(email: string, excludeId?: string): Promise<void> {
    const query: any = { email };
    
    const existingUser = await this.usersRepository.findOne({ where: query });
    
    if (existingUser && existingUser._id.toHexString() !== excludeId) {
      throw new ConflictException('Email already exists');
    }
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    await this.checkEmailExists(createUserDto.email);
    
    const user = this.usersRepository.create({
      email: createUserDto.email,
      name: createUserDto.name,
      password: await bcrypt.hash(createUserDto.password, 10),
      email_verified_at: null,
    });

    return await this.usersRepository.save(user);
  }

  async findAll(): Promise<User[]> {
    return await this.usersRepository.find();
  }

  async findOne(id: string | ObjectId): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { _id: typeof id === 'string' ? new ObjectId(id) : id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async update(id: string | ObjectId, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);
    
    if (updateUserDto.email) {
      await this.checkEmailExists(updateUserDto.email, user._id.toHexString());
    }
    
    Object.assign(user, updateUserDto);
    return await this.usersRepository.save(user);
  }

  async remove(id: string | ObjectId): Promise<void> {
    const user = await this.findOne(id);
    await this.usersRepository.remove(user);
  }
}
