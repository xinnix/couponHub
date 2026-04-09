import { Layout, Menu, Dropdown, Avatar, Button, Image } from "antd";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  DashboardOutlined,
  UserOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ShopOutlined,
  TagOutlined,
  ShoppingCartOutlined,
  AccountBookOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  AppstoreOutlined,
} from "@ant-design/icons";
import { useState } from "react";
import { useAuth } from "../auth";

const { Header, Sider, Content } = Layout;

export function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = [
    {
      key: "dashboard",
      icon: <DashboardOutlined />,
      label: "仪表盘",
      onClick: () => navigate("/dashboard"),
    },
    {
      key: "business",
      icon: <AppstoreOutlined />,
      label: "业务管理",
      children: [
        {
          key: "/merchants",
          icon: <ShopOutlined />,
          label: "商户管理",
          onClick: () => navigate("/merchants"),
        },
        {
          key: "/merchant-categories",
          icon: <AppstoreOutlined />,
          label: "商户分类管理",
          onClick: () => navigate("/merchant-categories"),
        },
        {
          key: "/coupon-templates",
          icon: <TagOutlined />,
          label: "券模板管理",
          onClick: () => navigate("/coupon-templates"),
        },
        {
          key: "/orders",
          icon: <ShoppingCartOutlined />,
          label: "订单管理",
          onClick: () => navigate("/orders"),
        },
        {
          key: "/settlements",
          icon: <AccountBookOutlined />,
          label: "结算管理",
          onClick: () => navigate("/settlements"),
        },
        {
          key: "/redemptions",
          icon: <CheckCircleOutlined />,
          label: "核销记录",
          onClick: () => navigate("/redemptions"),
        },
        {
          key: "/users",
          icon: <UserOutlined />,
          label: "用户管理",
          onClick: () => navigate("/users"),
        },
      ],
    },
    {
      key: "content",
      icon: <FileTextOutlined />,
      label: "内容管理",
      children: [
        {
          key: "/news",
          icon: <FileTextOutlined />,
          label: "新闻管理",
          onClick: () => navigate("/news"),
        },
      ],
    },
    {
      key: "system",
      icon: <SettingOutlined />,
      label: "系统管理",
      children: [
        {
          key: "/admins",
          icon: <SafetyCertificateOutlined />,
          label: "管理员管理",
          onClick: () => navigate("/admins"),
        },
      ],
    },
  ];

  const userMenuItems = [
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "退出登录",
      onClick: async () => {
        try {
          await logout();
          navigate("/login");
        } catch (error) {
          console.error("Logout failed:", error);
        }
      },
    },
  ];

  // 获取当前选中的菜单项（用于子菜单中的项目）
  const getSelectedKeys = () => {
    const path = location.pathname;
    // 返回当前路径作为选中的 key
    return [path];
  };

  // 获取默认展开的子菜单
  const getDefaultOpenKeys = () => {
    const path = location.pathname;
    // 根据当前路径判断应该展开哪个子菜单
    if (
      [
        "/merchants",
        "/merchant-categories",
        "/coupon-templates",
        "/orders",
        "/settlements",
        "/redemptions",
        "/users",
      ].includes(path)
    ) {
      return ["business"];
    }
    if (["/news"].includes(path)) {
      return ["content"];
    }
    if (["/admins"].includes(path)) {
      return ["system"];
    }
    return [];
  };

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        style={{
          overflow: "auto",
          height: "100vh",
          position: "fixed",
          left: 0,
          top: 0,
          bottom: 0,
        }}
      >
        {/* Logo 区域 */}
        <div
          style={{
            height: 64,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: collapsed ? "8px" : "16px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          }}
        >
          {collapsed ? (
            <img src="../logo.png" alt="" width={36} height={36} />
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <img src="../logo.png" alt="" width={36} height={36} />
              <div
                style={{
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: 16,
                  whiteSpace: "nowrap",
                }}
              >
                汉都天地
              </div>
            </div>
          )}
        </div>

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={getSelectedKeys()}
          defaultOpenKeys={getDefaultOpenKeys()}
          items={menuItems}
        />
      </Sider>
      <Layout
        style={{ marginLeft: collapsed ? 80 : 200, transition: "all 0.2s" }}
      >
        <Header
          style={{
            padding: "0 24px",
            background: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 1px 4px rgba(0,21,41,.08)",
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: 16, width: 64, height: 64 }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <div
                style={{
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Avatar
                  size="small"
                  icon={<UserOutlined />}
                  src={user?.avatar}
                />
                <span style={{ fontSize: 14 }}>{user?.username || "用户"}</span>
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content
          style={{
            margin: "24px 16px",
            padding: 24,
            minHeight: 280,
            background: "#fff",
            borderRadius: 8,
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
