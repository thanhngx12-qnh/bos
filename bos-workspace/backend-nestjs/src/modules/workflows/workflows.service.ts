// File: src/modules/workflows/workflows.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';

@Injectable()
export class WorkflowsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateWorkflowDto) {
    // 1. Kiểm tra Entity tồn tại
    const entity = await this.prisma.entity.findUnique({
      where: { id: dto.entityId },
    });
    if (!entity)
      throw new NotFoundException('Không tìm thấy Biểu mẫu (Entity).');

    // 2. Dùng Transaction để tạo Workflow và Version 1 cùng lúc
    return this.prisma.$transaction(async (tx) => {
      const workflow = await tx.workflow.create({
        data: {
          entityId: dto.entityId,
          name: dto.name,
          description: dto.description,
        },
      });

      const version = await tx.workflowVersion.create({
        data: {
          workflowId: workflow.id,
          version: 1,
          status: 'DRAFT', // Mặc định là bản nháp
        },
      });

      return { ...workflow, versions: [version] };
    });
  }

  async findAll() {
    return this.prisma.workflow.findMany({
      include: {
        entity: { select: { id: true, name: true, code: true } },
        versions: { orderBy: { version: 'desc' } }, // Version mới nhất lên đầu
      },
      orderBy: { id: 'desc' },
    });
  }

  async findOne(id: number) {
    const workflow = await this.prisma.workflow.findUnique({
      where: { id },
      include: {
        versions: {
          include: { steps: true }, // Tương lai sẽ lấy cả bước duyệt
          orderBy: { version: 'desc' },
        },
      },
    });

    if (!workflow) throw new NotFoundException('Không tìm thấy Quy trình.');
    return workflow;
  }

  async update(id: number, dto: UpdateWorkflowDto) {
    await this.findOne(id);
    return this.prisma.workflow.update({
      where: { id },
      data: dto,
    });
  }

  // --- TÍNH NĂNG ĐẶC BIỆT: CLONE VERSION ---
  async cloneVersion(workflowId: number, sourceVersionId: number) {
    const workflow = await this.findOne(workflowId);

    const sourceVersion = await this.prisma.workflowVersion.findUnique({
      where: { id: sourceVersionId },
      include: { steps: true }, // Lấy kèm các bước (để sau này clone cả bước)
    });

    if (!sourceVersion || sourceVersion.workflowId !== workflowId) {
      throw new BadRequestException('Phiên bản nguồn không hợp lệ.');
    }

    // Tìm version lớn nhất hiện tại
    const maxVersion = workflow.versions.reduce(
      (max, v) => (v.version > max ? v.version : max),
      0,
    );

    // Tương lai ở Chặng 2, chúng ta sẽ viết thêm code copy `Steps` và `Transitions` vào đây
    // Hiện tại chỉ tạo Vỏ Version mới
    const newVersion = await this.prisma.workflowVersion.create({
      data: {
        workflowId,
        version: maxVersion + 1,
        status: 'DRAFT',
      },
    });

    return newVersion;
  }

  // --- ĐỔI TRẠNG THÁI VERSION (PUBLISH/ARCHIVE) ---
  async updateVersionStatus(
    workflowId: number,
    versionId: number,
    status: string,
  ) {
    const validStatuses = ['DRAFT', 'PUBLISHED', 'ARCHIVED'];
    if (!validStatuses.includes(status)) {
      throw new BadRequestException(
        'Trạng thái không hợp lệ (DRAFT, PUBLISHED, ARCHIVED).',
      );
    }

    // Nếu muốn Publish một Version, tự động Archive các Version đang Publish khác của Workflow này
    if (status === 'PUBLISHED') {
      await this.prisma.workflowVersion.updateMany({
        where: { workflowId, status: 'PUBLISHED' },
        data: { status: 'ARCHIVED' },
      });
    }

    return this.prisma.workflowVersion.update({
      where: { id: versionId, workflowId }, // Đảm bảo versionId thuộc về workflowId
      data: { status },
    });
  }
  // --- BẢO VỆ XÓA QUY TRÌNH ---
  async remove(id: number) {
    const workflow = await this.findOne(id);

    // Kiểm tra xem có bất kỳ Version nào của quy trình này đã từng chạy thực tế chưa
    const hasInstances = await this.prisma.workflowInstance.findFirst({
      where: { version: { workflowId: id } },
    });

    if (hasInstances) {
      throw new BadRequestException(
        'Không thể xóa: Quy trình này đã phát sinh các lượt chạy (phiếu duyệt) trong thực tế.',
      );
    }

    return this.prisma.workflow.delete({ where: { id } });
  }
}
