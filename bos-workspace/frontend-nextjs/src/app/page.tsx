// File: src/app/page.tsx
'use client';

import React, { useState } from 'react';
import { 
  Layout, 
  Menu, 
  Breadcrumb, 
  Avatar, 
  Dropdown, 
  Space, 
  Card, 
  Button, 
  Badge, 
  Empty, 
  Spin, 
  Typography, 
  Row, 
  Col,
  theme
} from 'antd';
import { 
  DashboardOutlined, 
  PartitionOutlined, 
  BuildOutlined, 
  DeploymentUnitOutlined, 
  BellOutlined, 
  UserOutlined, 
  GlobalOutlined,
  ArrowRightOutlined,
  LoadingOutlined
} from '@ant-design/icons';

const { Header, Sider, Content } = Layout;
const { Title, Paragraph, Text } = Typography;

export default function DashboardPortal() {
  const [collapsed, setCollapsed] = useState(false);
  const [activeTenant, setActiveTenant] = useState('Công ty Vận tải BOS (vantai_bos)');
  
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const tenantMenu = {
    items: [
      {
        key: '1',
        label: 'Tập đoàn Công nghệ BOS',
        onClick: () => setActiveTenant('Tập đoàn Công nghệ BOS (tech_bos)'),
      },
      {
        key: '2',
        label: 'Công ty Vận tải BOS',
        onClick: () => setActiveTenant('Công ty Vận tải BOS (vantai_bos)'),
      },
    ],
  };

  const userMenu = {
    items: [
      { key: 'profile', label: 'Thông tin cá nhân' },
      { key: 'security', label: 'Thiết lập bảo mật' },
      { type: 'divider' as const },
      { key: 'logout', label: 'Đăng xuất hệ thống', danger: true },
    ],
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Sider Navigation */}
      <Sider 
        collapsible 
        collapsed={collapsed} 
        onCollapse={(value) => setCollapsed(value)}
        theme="light"
        style={{ borderRight: '1px solid #f0f0f0' }}
      >
        <div className="flex items-center justify-center py-4 border-b border-gray-100" style={{ minHeight: '64px' }}>
          <Title level={4} style={{ margin: 0, color: '#0050b3' }}>
            {collapsed ? 'BOS' : 'BOS Platform'}
          </Title>
        </div>
        <Menu
          theme="light"
          defaultSelectedKeys={['dashboard']}
          mode="inline"
          items={[
            { key: 'dashboard', icon: <DashboardOutlined />, label: 'Bảng tổng quan' },
            { key: 'tenants', icon: <GlobalOutlined />, label: 'Quản trị SaaS Tenant' },
            { key: 'organization', icon: <PartitionOutlined />, label: 'Cơ cấu Tổ chức' },
            { key: 'metadata', icon: <BuildOutlined />, label: 'Biểu mẫu Động' },
            { key: 'workflow', icon: <DeploymentUnitOutlined />, label: 'Luồng Quy trình' },
          ]}
        />
      </Sider>

      {/* Main Layout Area */}
      <Layout>
        {/* Header Section */}
        <Header 
          style={{ 
            padding: '0 24px', 
            background: colorBgContainer, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            borderBottom: '1px solid #f0f0f0'
          }}
        >
          <Space size="middle">
            {/* Bộ chọn Tenant thông minh */}
            <Dropdown menu={tenantMenu} trigger={['click']}>
              <Button icon={<GlobalOutlined />}>
                <Space>
                  <Text strong>{activeTenant}</Text>
                </Space>
              </Button>
            </Dropdown>
          </Space>

          {/* Công cụ góc phải */}
          <Space size="large">
            <Badge count={3} dot>
              <Button type="text" shape="circle" icon={<BellOutlined />} />
            </Badge>
            <Dropdown menu={userMenu} placement="bottomRight">
              <Space style={{ cursor: 'pointer' }}>
                <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#0050b3' }} />
                <div className="hidden md:block">
                  <Text strong>Hệ thống Admin</Text>
                </div>
              </Space>
            </Dropdown>
          </Space>
        </Header>

        {/* Content Section */}
        <Content style={{ margin: '24px 24px 0', overflow: 'initial' }}>
          <Space direction="vertical" size="large" className="w-full">
            
            {/* Page Header Tiêu Chuẩn */}
            <div className="flex justify-between items-center bg-white p-6 rounded-lg border border-gray-100">
              <div>
                <Breadcrumb 
                  items={[
                    { title: 'Trang chủ' },
                    { title: 'Bảng tổng quan' },
                  ]} 
                />
                <Title level={2} style={{ margin: '8px 0 0 0' }}>Bảng điều khiển Trung tâm</Title>
                <Paragraph type="secondary" style={{ margin: '4px 0 0 0' }}>
                  Hệ thống Động hóa Doanh nghiệp đa ngành Low-Code - Trạng thái hệ thống tổng quan.
                </Paragraph>
              </div>
              <Button type="primary" size="large" icon={<ArrowRightOutlined />}>
                Chạy thử Quy trình mẫu
              </Button>
            </div>

            {/* Dashboard Workspace Grid */}
            <Row gutter={[20, 20]}>
              {/* Thẻ 1: SaaS Onboarding */}
              <Col xs={24} md={12} lg={6}>
                <Card 
                  hoverable 
                  title="Xác thực đa doanh nghiệp" 
                  bordered={false}
                  className="shadow-sm"
                >
                  <Space direction="vertical" className="w-full">
                    <Text type="secondary">Xác thực cách ly dữ liệu triệt để.</Text>
                    <div className="pt-2">
                      <Badge status="success" text="Bảo mật RLS: Hoạt động" />
                    </div>
                    <Button type="primary" ghost block className="mt-2">
                      Xem Tenants
                    </Button>
                  </Space>
                </Card>
              </Col>

              {/* Thẻ 2: Kiểm thử Loading State */}
              <Col xs={24} md={12} lg={6}>
                <Card 
                  hoverable 
                  title="Cơ cấu Tổ chức" 
                  bordered={false}
                  className="shadow-sm"
                >
                  <div className="flex justify-center items-center py-4" style={{ minHeight: '110px' }}>
                    <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} tip="Đang truy vấn Closure Table..." />
                  </div>
                </Card>
              </Col>

              {/* Thẻ 3: Kiểm thử Empty State */}
              <Col xs={24} md={24} lg={12}>
                <Card 
                  hoverable 
                  title="Thiết kế Biểu mẫu Động" 
                  bordered={false}
                  className="shadow-sm"
                >
                  <Empty 
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="Không có Metadata Entity nào được cấu hình cho tenant này."
                  >
                    <Button type="primary" size="small">Khởi tạo Entity Đầu tiên</Button>
                  </Empty>
                </Card>
              </Col>
            </Row>

          </Space>
        </Content>
      </Layout>
    </Layout>
  );
}
