// File: src/modules/auth/auth.controller.ts
import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards, Get, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterTenantDto } from './dto/register-tenant.dto'; // <-- IMPORT DTO MỚI
import { SelectTenantDto } from './dto/select-tenant.dto';
import { SwitchTenantDto } from './dto/switch-tenant.dto';
import { ForgotPasswordRequestDto, ForgotPasswordResetDto } from './dto/forgot-password.dto';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../../core/guards/super-admin.guard';

@ApiTags('Auth (Xác thực)')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Gửi mã OTP quên mật khẩu về email' })
  forgotPassword(@Body() dto: ForgotPasswordRequestDto) {
    return this.authService.sendForgotPasswordOtp(dto.email);
  }

  @Post('reset-password-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đặt lại mật khẩu bằng mã OTP' })
  resetPasswordWithOtp(@Body() dto: ForgotPasswordResetDto) {
    return this.authService.resetPasswordWithOtp(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng nhập vào hệ thống' })
  @ApiResponse({ status: 200, description: 'Trả về JWT Token' })
  @ApiResponse({ status: 401, description: 'Sai tài khoản hoặc mật khẩu' })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('login/select-tenant')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng nhập với doanh nghiệp đã chọn' })
  loginSelectTenant(@Body() selectTenantDto: SelectTenantDto) {
    return this.authService.loginSelectTenant(selectTenantDto);
  }

  @Get('my-tenants')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy tất cả các doanh nghiệp liên kết với email hiện tại' })
  getMyTenants(@Request() req) {
    return this.authService.getMyTenants(req.user.email);
  }

  @Post('switch-tenant')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Chuyển đổi ngữ cảnh doanh nghiệp đang làm việc' })
  switchTenant(@Request() req, @Body() dto: SwitchTenantDto) {
    return this.authService.switchTenant(req.user.email, dto.tenantId);
  }

  // --- ENDPOINT MỚI: ĐĂNG KÝ DOANH NGHIỆP SAAS CỦA HỆ THỐNG (CHỈ SUPER ADMIN) ---
  @Post('register-tenant')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Đăng ký doanh nghiệp mới (Chỉ Super Admin)' })
  @ApiResponse({
    status: 201,
    description: 'Khởi tạo Doanh nghiệp và tài khoản Admin thành công!',
  })
  @ApiResponse({
    status: 409,
    description: 'Trùng Email hoặc trùng Mã doanh nghiệp',
  })
  registerTenant(@Body() dto: RegisterTenantDto) {
    return this.authService.registerTenant(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy thông tin tài khoản hiện tại' })
  getMe(@Request() req) {
    return this.authService.getMe(req.user.userId);
  }
}
