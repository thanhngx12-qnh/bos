// File: src/app/settings/components/BusinessCalendarManager.tsx
"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  Row,
  Col,
  Checkbox,
  TimePicker,
  Button,
  List,
  DatePicker,
  Typography,
  Space,
  Divider,
  Tag,
  App,
  Spin,
} from "antd";
import {
  CalendarOutlined,
  ClockCircleOutlined,
  PlusOutlined,
  DeleteOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";
import { useBusinessCalendar, useUpdateBusinessCalendar, CalendarShift } from "@/hooks/useBusinessCalendar";

const { Text, Title, Paragraph } = Typography;

export default function BusinessCalendarManager() {
  const { message } = App.useApp();
  const { data: calendar, isLoading, refetch } = useBusinessCalendar();
  const updateCalendarMutation = useUpdateBusinessCalendar();

  // Local state for shifts
  const [shifts, setShifts] = useState<CalendarShift[]>([]);
  // Local state for holidays list (strings in format YYYY-MM-DD)
  const [holidays, setHolidays] = useState<string[]>([]);
  const [newHolidayDate, setNewHolidayDate] = useState<Dayjs | null>(null);

  // Initialize local state from API data
  useEffect(() => {
    if (calendar) {
      setShifts(calendar.shifts || []);
      setHolidays(calendar.holidays || []);
    }
  }, [calendar]);

  const handleWorkingChange = (dayOfWeek: number, checked: boolean) => {
    setShifts((prev) =>
      prev.map((s) => {
        if (s.dayOfWeek === dayOfWeek) {
          return {
            ...s,
            working: checked,
            hours: checked && s.hours.length === 0
              ? [{ start: "08:00", end: "12:00" }, { start: "13:30", end: "17:30" }]
              : s.hours,
          };
        }
        return s;
      })
    );
  };

  const handleShiftTimeChange = (
    dayOfWeek: number,
    shiftIndex: number,
    field: "start" | "end",
    timeStr: string
  ) => {
    setShifts((prev) =>
      prev.map((s) => {
        if (s.dayOfWeek === dayOfWeek) {
          const updatedHours = [...s.hours];
          if (updatedHours[shiftIndex]) {
            updatedHours[shiftIndex] = {
              ...updatedHours[shiftIndex],
              [field]: timeStr,
            };
          }
          return { ...s, hours: updatedHours };
        }
        return s;
      })
    );
  };

  const addHourSlot = (dayOfWeek: number) => {
    setShifts((prev) =>
      prev.map((s) => {
        if (s.dayOfWeek === dayOfWeek) {
          return {
            ...s,
            hours: [...s.hours, { start: "08:00", end: "17:00" }],
          };
        }
        return s;
      })
    );
  };

  const removeHourSlot = (dayOfWeek: number, index: number) => {
    setShifts((prev) =>
      prev.map((s) => {
        if (s.dayOfWeek === dayOfWeek) {
          return {
            ...s,
            hours: s.hours.filter((_, i) => i !== index),
          };
        }
        return s;
      })
    );
  };

  const handleAddHoliday = () => {
    if (!newHolidayDate) return;
    const dateStr = newHolidayDate.format("YYYY-MM-DD");
    if (holidays.includes(dateStr)) {
      message.warning("Ngày lễ này đã tồn tại trong danh sách!");
      return;
    }
    setHolidays((prev) => [...prev, dateStr].sort());
    setNewHolidayDate(null);
    message.success(`Đã thêm ngày nghỉ lễ: ${newHolidayDate.format("DD/MM/YYYY")}`);
  };

  const handleRemoveHoliday = (dateStr: string) => {
    setHolidays((prev) => prev.filter((d) => d !== dateStr));
  };

  const handleSave = () => {
    updateCalendarMutation.mutate(
      { shifts, holidays },
      {
        onSuccess: () => {
          message.success("Cập nhật lịch làm việc doanh nghiệp thành công!");
          refetch();
        },
        onError: (err: any) => {
          message.error(err?.response?.data?.message || "Lỗi khi lưu cấu hình lịch làm việc.");
        },
      }
    );
  };

  const getDayName = (dayOfWeek: number) => {
    switch (dayOfWeek) {
      case 1:
        return "Thứ Hai";
      case 2:
        return "Thứ Ba";
      case 3:
        return "Thứ Tư";
      case 4:
        return "Thứ Năm";
      case 5:
        return "Thứ Sáu";
      case 6:
        return "Thứ Bảy";
      case 0:
        return "Chủ Nhật";
      default:
        return "";
    }
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: "center", padding: "50px 0" }}>
        <Spin size="large" tip="Đang tải lịch làm việc..." />
      </div>
    );
  }

  // Sort shifts from Mon to Sun (1, 2, 3, 4, 5, 6, 0)
  const sortedShifts = [...shifts].sort((a, b) => {
    const orderA = a.dayOfWeek === 0 ? 7 : a.dayOfWeek;
    const orderB = b.dayOfWeek === 0 ? 7 : b.dayOfWeek;
    return orderA - orderB;
  });

  return (
    <Card
      title={
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Space>
            <CalendarOutlined style={{ color: "#1890ff", fontSize: 18 }} />
            <Text strong style={{ fontSize: 16 }}>Thiết lập Lịch biểu & SLA Lịch doanh nghiệp</Text>
          </Space>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={updateCalendarMutation.isPending}
            onClick={handleSave}
            style={{ background: "linear-gradient(135deg, #1890ff 0%, #096dd9 100%)", border: "none" }}
          >
            Lưu cấu hình
          </Button>
        </div>
      }
      bodyStyle={{ padding: "24px" }}
    >
      <Paragraph type="secondary">
        Cấu hình lịch làm việc tuần và ngày nghỉ lễ của công ty để hệ thống tự động tính toán chính xác thời hạn xử lý SLA cho các bước phê duyệt hồ sơ (loại trừ ngày nghỉ).
      </Paragraph>

      <Row gutter={32}>
        {/* SHIFTS CONFIG */}
        <Col xs={24} lg={14}>
          <Title level={5} style={{ marginBottom: "16px", color: "#1f1f1f" }}>
            <ClockCircleOutlined style={{ marginRight: 8, color: "#1890ff" }} />
            Thời gian làm việc trong tuần
          </Title>

          <List
            dataSource={sortedShifts}
            renderItem={(shift) => (
              <List.Item
                style={{
                  padding: "16px 0",
                  borderBottom: "1px solid #f0f0f0",
                }}
              >
                <Row style={{ width: "100%", alignItems: "center" }} gutter={16}>
                  <Col span={6}>
                    <Checkbox
                      checked={shift.working}
                      onChange={(e) => handleWorkingChange(shift.dayOfWeek, e.target.checked)}
                    >
                      <Text strong style={{ fontSize: 14 }}>
                        {getDayName(shift.dayOfWeek)}
                      </Text>
                    </Checkbox>
                  </Col>

                  <Col span={18}>
                    {shift.working ? (
                      <Space direction="vertical" style={{ width: "100%" }} size={8}>
                        {shift.hours.map((hour, idx) => (
                          <Space key={idx} align="center">
                            <Text type="secondary" style={{ fontSize: 12 }}>Ca {idx + 1}:</Text>
                            <TimePicker
                              format="HH:mm"
                              value={hour.start ? dayjs(hour.start, "HH:mm") : null}
                              onChange={(time, timeStr) =>
                                handleShiftTimeChange(shift.dayOfWeek, idx, "start", String(timeStr))
                              }
                              allowClear={false}
                              style={{ width: 100 }}
                            />
                            <Text type="secondary">-</Text>
                            <TimePicker
                              format="HH:mm"
                              value={hour.end ? dayjs(hour.end, "HH:mm") : null}
                              onChange={(time, timeStr) =>
                                handleShiftTimeChange(shift.dayOfWeek, idx, "end", String(timeStr))
                              }
                              allowClear={false}
                              style={{ width: 100 }}
                            />
                            <Button
                              type="text"
                              danger
                              icon={<DeleteOutlined />}
                              onClick={() => removeHourSlot(shift.dayOfWeek, idx)}
                            />
                          </Space>
                        ))}
                        <Button
                          type="dashed"
                          size="small"
                          icon={<PlusOutlined />}
                          onClick={() => addHourSlot(shift.dayOfWeek)}
                          style={{ width: "fit-content" }}
                        >
                          Thêm ca làm việc
                        </Button>
                      </Space>
                    ) : (
                      <Text type="secondary" style={{ fontStyle: "italic" }}>
                        Nghỉ cuối tuần / Không làm việc
                      </Text>
                    )}
                  </Col>
                </Row>
              </List.Item>
            )}
          />
        </Col>

        {/* HOLIDAYS CONFIG */}
        <Col xs={24} lg={10}>
          <Card
            type="inner"
            title={
              <Space>
                <CalendarOutlined style={{ color: "#fa8c16" }} />
                <Text strong>Danh sách Ngày nghỉ lễ</Text>
              </Space>
            }
            bodyStyle={{ padding: "16px" }}
            style={{ background: "#fafafa" }}
          >
            <Paragraph type="secondary" style={{ fontSize: 13 }}>
              Thêm các ngày lễ lớn (ví dụ: Tết, Quốc khánh...) để hệ thống tự động loại trừ khi đếm ngược SLA.
            </Paragraph>

            <Space style={{ marginBottom: "20px", display: "flex" }}>
              <DatePicker
                format="DD/MM/YYYY"
                placeholder="Chọn ngày lễ..."
                value={newHolidayDate}
                onChange={setNewHolidayDate}
                style={{ width: "100%" }}
              />
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAddHoliday}>
                Thêm
              </Button>
            </Space>

            <Divider style={{ margin: "12px 0" }} />

            <div style={{ maxHeight: "350px", overflowY: "auto" }}>
              {holidays.length === 0 ? (
                <div style={{ textAlign: "center", padding: "20px 0" }}>
                  <Text type="secondary" style={{ fontStyle: "italic" }}>Chưa cấu hình ngày nghỉ lễ</Text>
                </div>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {holidays.map((dateStr) => (
                    <Tag
                      key={dateStr}
                      color="volcano"
                      closable
                      onClose={(e) => {
                        e.preventDefault();
                        handleRemoveHoliday(dateStr);
                      }}
                      style={{ padding: "4px 8px", fontSize: 13 }}
                    >
                      {dayjs(dateStr).format("DD/MM/YYYY")}
                    </Tag>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </Col>
      </Row>
    </Card>
  );
}
