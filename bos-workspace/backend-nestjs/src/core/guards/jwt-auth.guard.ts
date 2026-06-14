// File: src/core/guards/jwt-auth.guard.ts
import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    // Add custom logic here if needed
    return super.canActivate(context);
  }

  handleRequest(err, user, info) {
    // Ném lỗi tiếng Việt thân thiện nếu không có Token hoặc Token hết hạn
    if (err || !user) {
      throw (
        err ||
        new UnauthorizedException(
          'Bạn cần đăng nhập (truyền JWT Token) để thực hiện chức năng này.',
        )
      );
    }
    return user;
  }
}
