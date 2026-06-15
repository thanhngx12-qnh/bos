// File: src/modules/auth/auth.controller.ts
import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterTenantDto } from './dto/register-tenant.dto'; // <-- IMPORT DTO MỚI

@ApiTags('Auth (Xác thực)')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng nhập vào hệ thống' })
  @ApiResponse({ status: 200, description: 'Trả về JWT Token' })
  @ApiResponse({ status: 401, description: 'Sai tài khoản hoặc mật khẩu' })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  // --- ENDPOINT MỚI: ĐĂNG KÝ DOANH NGHIỆP SAAS CÔNG KHAI (PUBLIC API) ---
  @Post('register-tenant')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Đăng ký doanh nghiệp mới (Onboarding SaaS)' })
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
}
