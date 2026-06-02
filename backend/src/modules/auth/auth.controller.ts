import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import {
  SendOtpDto,
  VerifyOtpDto,
  GoogleAuthDto,
  AppleAuthDto,
  RefreshTokenDto,
  GuestLoginDto,
} from './dto/auth.dto';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ThrottlerGuard } from '@nestjs/throttler';

@ApiTags('Authentication')
@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('phone/send-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send OTP to phone number' })
  async sendOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendOtp(dto.phone);
  }

  @Public()
  @Post('phone/verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify OTP and login/register' })
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(
      dto.phone,
      dto.otp,
      dto.deviceId,
      dto.referralCode,
    );
  }

  @Public()
  @Post('google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with Google OAuth' })
  async loginWithGoogle(@Body() dto: GoogleAuthDto) {
    return this.authService.loginWithGoogle(
      dto.idToken,
      dto.deviceId,
      dto.referralCode,
    );
  }

  @Public()
  @Post('apple')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with Apple Sign In' })
  async loginWithApple(@Body() dto: AppleAuthDto) {
    return this.authService.loginWithApple(
      dto.identityToken,
      dto.givenName,
      dto.familyName,
      dto.deviceId,
    );
  }

  @Public()
  @Post('guest')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Guest login (temporary account)' })
  async guestLogin(@Body() dto: GuestLoginDto) {
    return this.authService.guestLogin(dto.deviceId);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  async refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout user' })
  async logout(@CurrentUser('id') userId: string) {
    await this.authService.logout(userId);
    return { message: 'Logged out successfully' };
  }
}
