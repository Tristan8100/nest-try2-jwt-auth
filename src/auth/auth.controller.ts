import { Controller, Body, Post, Get, Request } from '@nestjs/common';
import { SignInDto } from './dto/sign-in-dto';
import { AuthService } from './auth.service';
import { json } from 'stream/consumers';
import { AuthGuard } from './auth.guard';
import { UseGuards } from '@nestjs/common';
import { ResetPasswordDto, SendOtpDto, VerifyEmailDto } from './dto/send-otp-dto';
import { Send } from 'express';
import { RolesGuard } from './auth.user';

@Controller('api')
export class AuthController {
    constructor(private authService: AuthService) {}

    @Post('login')
    signIn(@Body() signInDto:SignInDto) {
       const val = this.authService.signIn(signInDto.email, signInDto.password);
       return val;
    }

    @UseGuards(AuthGuard)
    @Get('protected')
    getProtectedResource(@Request() req) {
        return { message: 'This is a protected resource', user: req.user };
    }

    @Post('register')
    register(@Body() registerDto) {
        const val = this.authService.register(registerDto);
        return val;
    }

    @Post('send-otp')
    sendOtp(@Body() data : SendOtpDto) {
        const val = this.authService.sendOtp(data);
        return val;
    }

    @Post('verify-otp')
    verifyEmail(@Body() data : VerifyEmailDto) {
        const val = this.authService.verifyEmail(data.email, data.otp);
        return val;
    }

    @Post('forgot-password')
    resetLink(@Body() data : SendOtpDto) {
        const val = this.authService.resetLink(data);
        return val;
    }

    @Post('forgot-password-token')
    verifyResetCode(@Body() data : VerifyEmailDto) {
        const val = this.authService.verifyResetCode(data);
        return val;
    }

    @Post('reset-password')
    resetPassword(@Body() data : ResetPasswordDto) {
        const val = this.authService.resetPassword(data);
        return val;
    }

    @UseGuards(AuthGuard, RolesGuard) // for roles
    @Get('verify-user')
    setUser(@Request() req) {
        return this.authService.user(req.user);
    }
}
