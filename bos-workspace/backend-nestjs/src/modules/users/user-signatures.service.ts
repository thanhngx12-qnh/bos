// File: src/modules/users/user-signatures.service.ts
import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSignatureDto } from './dto/create-signature.dto';

@Injectable()
export class UserSignaturesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: number, userId: number) {
    return this.prisma.userSignature.findMany({
      where: { tenantId, userId } as any,
      orderBy: { id: 'asc' } as any,
    });
  }

  async create(tenantId: number, userId: number, dto: CreateSignatureDto) {
    const existing = await this.prisma.userSignature.findFirst({
      where: { tenantId, userId, name: dto.name } as any,
    });
    if (existing) {
      throw new ConflictException(`Mẫu chữ ký/con dấu với tên "${dto.name}" đã tồn tại.`);
    }

    const count = await this.prisma.userSignature.count({
      where: { tenantId, userId } as any,
    });

    // If first signature, make it default
    const isDefault = count === 0 ? true : false;

    return this.prisma.userSignature.create({
      data: {
        tenantId,
        userId,
        name: dto.name,
        type: dto.type,
        signatureUrl: dto.signatureUrl,
        isDefault,
      } as any,
    });
  }

  async setDefault(tenantId: number, userId: number, signatureId: number) {
    const signature = await this.prisma.userSignature.findFirst({
      where: { id: signatureId, tenantId, userId } as any,
    });
    if (!signature) {
      throw new NotFoundException('Không tìm thấy mẫu chữ ký yêu cầu.');
    }

    return this.prisma.$transaction(async (tx) => {
      // Set all other signatures to non-default
      await tx.userSignature.updateMany({
        where: { tenantId, userId, id: { not: signatureId } } as any,
        data: { isDefault: false } as any,
      });

      // Set target signature to default
      return tx.userSignature.update({
        where: { id: signatureId } as any,
        data: { isDefault: true } as any,
      });
    });
  }

  async remove(tenantId: number, userId: number, signatureId: number) {
    const signature = await this.prisma.userSignature.findFirst({
      where: { id: signatureId, tenantId, userId } as any,
    });
    if (!signature) {
      throw new NotFoundException('Không tìm thấy mẫu chữ ký yêu cầu.');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.userSignature.delete({
        where: { id: signatureId } as any,
      });

      // If we deleted the default one, set another one as default if exists
      if (signature.isDefault) {
        const nextSig = await tx.userSignature.findFirst({
          where: { tenantId, userId } as any,
          orderBy: { id: 'asc' } as any,
        });
        if (nextSig) {
          await tx.userSignature.update({
            where: { id: nextSig.id } as any,
            data: { isDefault: true } as any,
          });
        }
      }
      return { success: true };
    });
  }
}
