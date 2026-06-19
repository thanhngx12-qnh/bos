// File: src/app/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
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
  theme,
  App as AntdApp
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
import { useRouter } from 'next/navigation';
import { useTenantDetail } from '@/hooks/useTenant';

const { Header, Sider, Content } = Layout;
const { Title, Paragraph, Text } = Typography;

export default function DashboardPortal() {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  
  // State quản lý Tenant và User động
  const [tenantId, setTenantId] = useState<number | null>(null);
  const [userName, setUserName] = useState<string>('Thành viên BOS');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('bos_token');
      if (!token) {
        router.push('/auth/login');
        return;
      }
      const storedTenantId = localStorage.getItem('bos_tenant_id');
      const storedUserName = localStorage.getItem('bos_user_name');
      if (storedTenantId) {
        setTenantId(Number(storedTenantId));
      }
      if (storedUserName) {
        setUserName(storedUserName);
      }
    }
  }, [router]);

  const tenantQuery = useTenantDetail(tenantId);
  const activeTenantName = tenantQuery.data
    ? `${tenantQuery.data.name} (${tenantQuery.data.code})`
    : 'Đang tải thông tin doanh nghiệp...';

  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const handleLogout = () => {
    localStorage.removeItem('bos_token');
    localStorage.removeItem('bos_tenant_id');
    localStorage.removeItem('bos_user_name');
    router.push('/auth/login');
  };

  const handleMenuClick = (e: { key: string }) => {
    if (e.key === 'dashboard') router.push('/');
    if (e.key === 'organization') router.push('/organization');
    if (e.key === 'metadata') router.push('/metadata');
  };

  const userMenu = {
    items: [
      { key: 'profile', label: 'Thông tin cá nhân' },
      { key: 'security', label: 'Thiết lập bảo mật' },
      { type: 'divider' as const },
      { key: 'logout', label: 'Đăng xuất hệ thống', danger: true },
    ],
    onClick: (info: any) => {
      if (info.key === 'logout') {
        handleLogout();
      }
    }
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
          selectedKeys={['dashboard']}
          mode="inline"
          onClick={handleMenuClick}
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
            <Button icon={<GlobalOutlined />} loading={tenantQuery.isLoading}>
              <Space>
                <Text strong>{activeTenantName}</Text>
              </Space>
            </Button>
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
                  <Text strong>{userName}</Text>
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
