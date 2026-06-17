// File: src/core/interfaces/domain-event.interface.ts
export interface DomainEventMetadata {
  tenantId: number;
  correlationId: string; // Truy vết toàn bộ giao dịch
  causationId?: string; // Sự kiện nào đã gây ra sự kiện này
  userId?: number;
  timestamp: string;
}

export interface DomainEvent<T = any> {
  eventType: string; // VD: "record.created"
  payload: T;
  metadata: DomainEventMetadata;
}
