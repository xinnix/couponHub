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
  EditOutlined,
  LockOutlined,
} from "@ant-design/icons";
import { useState, useMemo } from "react";
import { useAuth } from "../auth";
import { ProfileModal } from "../components/ProfileModal";
import { ChangePasswordModal } from "../components/ChangePasswordModal";

const { Header, Sider, Content } = Layout;

export function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);

  // 菜单项配置（带权限标识）
  const allMenuItems = [
    {
      key: "dashboard",
      permission: "menu:dashboard",
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
          permission: "menu:merchants",
          icon: <ShopOutlined />,
          label: "商户管理",
          onClick: () => navigate("/merchants"),
        },
        {
          key: "/merchant-categories",
          permission: "menu:merchant-categories",
          icon: <AppstoreOutlined />,
          label: "商户分类管理",
          onClick: () => navigate("/merchant-categories"),
        },
        {
          key: "/coupon-templates",
          permission: "menu:coupon-templates",
          icon: <TagOutlined />,
          label: "券模板管理",
          onClick: () => navigate("/coupon-templates"),
        },
        {
          key: "/orders",
          permission: "menu:orders",
          icon: <ShoppingCartOutlined />,
          label: "订单管理",
          onClick: () => navigate("/orders"),
        },
        {
          key: "/settlements",
          permission: "menu:settlements",
          icon: <AccountBookOutlined />,
          label: "结算管理",
          onClick: () => navigate("/settlements"),
        },
        {
          key: "/redemptions",
          permission: "menu:redemptions",
          icon: <CheckCircleOutlined />,
          label: "核销记录",
          onClick: () => navigate("/redemptions"),
        },
        {
          key: "/users",
          permission: "menu:users",
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
          permission: "menu:news",
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
          permission: "menu:admins",
          icon: <SafetyCertificateOutlined />,
          label: "管理员管理",
          onClick: () => navigate("/admins"),
        },
        {
          key: "/roles",
          permission: "menu:roles",
          icon: <SafetyCertificateOutlined />,
          label: "角色管理",
          onClick: () => navigate("/roles"),
        },
      ],
    },
  ];

  // 权限过滤函数
  const filterMenuByPermission = (items: any[]): any[] => {
    // Super Admin 拥有所有权限，直接返回所有菜单
    const hasSuperAdminRole = user?.roles?.some((r: any) => r?.role?.slug === 'super_admin') || false;
    if (hasSuperAdminRole) {
      console.log('Super Admin detected, showing all menus');
      return items;
    }

    console.log('User permissions:', user?.permissions);
    console.log('User roles:', user?.roles);

    return items
      .filter(item => {
        // 父菜单：至少有一个子菜单有权限才显示
        if (item.children) {
          const filteredChildren = filterMenuByPermission(item.children);
          return filteredChildren.length > 0;
        }

        // 子菜单：检查权限
        if (!item.permission) return true; // 无权限要求的菜单项直接显示
        return user?.permissions?.includes(item.permission) || false;
      })
      .map(item => {
        // 如果有 children，返回修改后的对象（不污染原始数据）
        if (item.children) {
          return {
            ...item,
            children: filterMenuByPermission(item.children)
          };
        }
        return item;
      });
  };

  // 使用 useMemo 缓存过滤后的菜单，避免每次渲染都重新计算
  const menuItems = useMemo(
    () => filterMenuByPermission(allMenuItems),
    [user?.permissions, user?.roles]
  );

  const userMenuItems = [
    {
      key: "profile",
      icon: <EditOutlined />,
      label: "个人信息",
      onClick: () => setProfileModalVisible(true),
    },
    {
      key: "password",
      icon: <LockOutlined />,
      label: "修改密码",
      onClick: () => setPasswordModalVisible(true),
    },
    {
      type: 'divider',
    },
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
    if (["/admins", "/roles"].includes(path)) {
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

      {/* Modals */}
      <ProfileModal
        visible={profileModalVisible}
        onCancel={() => setProfileModalVisible(false)}
        onSuccess={() => setProfileModalVisible(false)}
      />
      <ChangePasswordModal
        visible={passwordModalVisible}
        onCancel={() => setPasswordModalVisible(false)}
        onSuccess={() => setPasswordModalVisible(false)}
      />
    </Layout>
  );
}
