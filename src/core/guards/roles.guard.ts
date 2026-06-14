// File: src/core/guards/roles.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "../decorators/roles.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true; // Nếu API không yêu cầu Role thì cho qua
    }

    const { user } = context.switchToHttp().getRequest();
    // Giả định user có thuộc tính roleName (Sẽ được JWT Guard đính kèm vào sau khi login)
    if (!user || !requiredRoles.includes(user.roleName)) {
      throw new ForbiddenException(
        "Bạn không có quyền truy cập chức năng này.",
      );
    }

    return true;
  }
}
