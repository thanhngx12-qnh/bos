// File: src/prisma/prisma.helper.ts

export interface PaginateOptions {
  page?: number | string;
  limit?: number | string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export async function paginate(
  prismaModel: any, // Nhận vào bất kỳ Model nào của Prisma (User, Department, Workflow...)
  where: Record<string, any> = {},
  options: PaginateOptions = {},
  include: Record<string, any> | undefined = undefined,
) {
  const page = Math.max(1, Number(options.page || 1));
  const limit = Math.max(1, Number(options.limit || 10));
  const skip = (page - 1) * limit;

  const sortBy = options.sortBy || 'id';
  const sortOrder = options.sortOrder || 'desc';

  // Chạy truy vấn song song tối ưu hiệu năng
  const [data, total] = await Promise.all([
    prismaModel.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include,
    }),
    prismaModel.count({ where }),
  ]);

  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}
