import { Injectable, ConflictException, ForbiddenException, InternalServerErrorException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { User } from 'src/users/entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { ObjectId } from 'mongodb';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { EmailVerification } from './entities/email-verification.entity';
import { PasswordReset } from './entities/password-reset.entity';
import { transporter } from '../../lib/transporter';
import { SendOtpDto, VetifyCodeDto, ResetPasswordDto } from './dto/send-otp-dto';
import crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepository: MongoRepository<User>,
    @InjectRepository(EmailVerification)
    private emailVerificationRepository: MongoRepository<EmailVerification>,
    @InjectRepository(PasswordReset)
    private passwordResetRepository: MongoRepository<PasswordReset>,
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  private async sendVerificationCode(email: string): Promise<string> {
    const val = Math.floor(100000 + Math.random() * 900000).toString();
    const existing = await this.emailVerificationRepository.findOne({ where: { email } });

    if (existing) {
      Object.assign(existing, { code: val });
      await this.emailVerificationRepository.save(existing);
    } else {
      const newRecord = this.emailVerificationRepository.create({ email, code: val });
      await this.emailVerificationRepository.save(newRecord);
    }

    try {
      await transporter.sendMail({
        from: `"ECHOMIND" <${process.env.MAIL_FROM_ADDRESS}>`,
        to: email,
        subject: 'Your Echomind Verification Code',
        html: `<div>Your verification code is: <strong>${val}</strong></div>`,
      });
    } catch (err) {
      throw new ConflictException('Failed to send verification email');
    }

    return val;
  }

  async signIn(email: string, password: string): Promise<any> {
    const user = await this.usersRepository.findOne({ where: { email } });
    if (!user) throw new UnauthorizedException('User not found');

    if (!user.email_verified_at) {
      await this.sendVerificationCode(user.email);
      throw new ForbiddenException('Email not verified');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new UnauthorizedException('Invalid credentials');

    const payload = { id: user._id.toHexString(), email: user.email }; //changed to id
    const token = this.jwtService.sign(payload);

    return {
      message: 'Login success',
      token,
      status: 'success',
      user_info: { id: user._id.toHexString(), name: user.name, email: user.email },
    };
  }

  async register(register: CreateUserDto): Promise<any> {
    const user = await this.usersService.create(register);
    const val = await this.sendVerificationCode(user.email);
    return { message: 'Registration success', email: user.email, code: val };
  }

  async sendOtp(sendOtpDto: SendOtpDto): Promise<any> {
    const user = await this.usersRepository.findOne({ where: { email: sendOtpDto.email } });
    if (!user) throw new UnauthorizedException('User not found');
    if (user.email_verified_at) throw new UnauthorizedException('Email already verified');

    const val = await this.sendVerificationCode(sendOtpDto.email);
    return { message: 'OTP sent successfully' };
  }

  async verifyEmail(email: string, code: string): Promise<any> {
    const record = await this.emailVerificationRepository.findOne({ where: { email, code } });
    if (!record) throw new UnauthorizedException('Invalid verification code');

    const dbNow = Date.now();
    if (record.updated_at.getTime() + 10 * 60 * 1000 < dbNow) {
      throw new UnauthorizedException('Verification code expired');
    }

    await this.usersRepository.update(
      { email },
      { email_verified_at: new Date() }
    );

    await this.emailVerificationRepository.delete({ email });
    return { message: 'Email verified successfully' };
  }

  async resetLink(sendResetLink: SendOtpDto): Promise<any> {
    const email = sendResetLink.email;
    const user = await this.usersRepository.findOne({ where: { email } });
    if (!user) throw new UnauthorizedException('User not found');

    const check = await this.passwordResetRepository.findOne({ where: { email } });
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    if (!check) {
      const data = this.passwordResetRepository.create({ email, code });
      await this.passwordResetRepository.save(data);
    } else {
      check.code = code;
      await this.passwordResetRepository.save(check);
    }

    await transporter.sendMail({
      from: `"ECHOMIND" <${process.env.MAIL_FROM_ADDRESS}>`,
      to: email,
      subject: 'Your Echomind Password Reset Code',
      html: `<div>Your password reset code is: <strong>${code}</strong></div>`,
    });

    return { message: 'Password reset link sent successfully' };
  }

  async verifyResetCode(data: VetifyCodeDto): Promise<any> {
    const { email, otp } = data;
    const record = await this.passwordResetRepository.findOne({ where: { email, code: otp } });
    if (!record) throw new NotFoundException('Invalid reset code or email');

    const dbNow = Date.now();
    if (record.updated_at.getTime() + 10 * 60 * 1000 < dbNow) {
      throw new UnauthorizedException('Verification code expired');
    }

    const token = crypto.randomBytes(30).toString('hex');
    const hashedToken = await bcrypt.hash(token, 10);

    record.token = hashedToken;
    await this.passwordResetRepository.save(record);

    return { message: 'Reset code verified successfully', token };
  }

  async resetPassword(data: ResetPasswordDto): Promise<any> {
    const { email, token, password } = data;
    const record = await this.passwordResetRepository.findOne({ where: { email } });
    if (!record) throw new NotFoundException('Invalid reset code or email');

    const isMatch = await bcrypt.compare(token, record.token);
    if (!isMatch) throw new UnauthorizedException('Invalid reset token');

    await this.usersRepository.update({ email }, { password: await bcrypt.hash(password, 10) });
    await this.passwordResetRepository.delete({ email });

    return { message: 'Password reset successfully' };
  }

  async user(data: any): Promise<any> {
        const user = await this.usersRepository.findOne({
            where: { email: data.email },
        })

        if (!user) {
            throw new NotFoundException('User not foundssssssssss');
        }

        return { 
            message: 'User details',
            user_info: {
                id: user?._id,
                name: user?.name,
                email: user?.email
            }
        };
    }
}
