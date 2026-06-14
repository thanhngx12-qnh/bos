// File: src/modules/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    // 1. Tìm người dùng qua email
    const user = await this.usersService.findByEmailForAuth(loginDto.email);
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Email không tồn tại hoặc tài khoản đã bị khóa.');
    }

    // 2. Kiểm tra mật khẩu (So sánh hash)
    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Mật khẩu không chính xác.');
    }

    // 3. Tạo Payload chứa thông tin cơ bản đưa vào Token
    const payload = { 
      sub: user.id, // Subject thường dùng lưu ID
      email: user.email, 
      roleId: user.roleId 
    };

    // 4. Trả về JWT Token và thông tin user (loại bỏ password)
    const { password, ...userInfo } = user;
    return {
      message: 'Đăng nhập thành công',
      accessToken: this.jwtService.sign(payload),
      user: userInfo,
    };
  }
}