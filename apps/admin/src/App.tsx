import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Refine } from "@refinedev/core";
import { ConfigProvider, App as AntApp } from "antd";
import zhCN from "antd/locale/zh_CN";
import { useState } from "react";
import { dataProvider } from "./shared/dataProvider";
import { authProvider, AuthProvider } from "./shared/auth";
import { LoginPage, SessionExpiredPage, NotFoundPage } from "./modules/auth";
import { AdminLayout } from "./shared/layouts";
import { DashboardPage } from "./modules/dashboard";
import { RoleListPage, RoleDetailPage } from "./modules/role";
import { UserListPage, UserDetailPage } from "./modules/user";
import { MerchantListPage, MerchantDetailPage } from "./modules/merchant";
import { TemplateListPage, TemplateDetailPage } from "./modules/coupon-template";
import { OrderListPage, OrderDetailPage } from "./modules/order";
import { SettlementListPage, SettlementDetailPage } from "./modules/settlement";
import { NewsListPage, NewsDetailPage } from "./modules/news";
import { RedemptionRecordsPage } from "./modules/redemption";
import { AdminListPage, AdminDetailPage } from "./modules/admin";
import { useMessageInitializer } from "./shared/hooks/useMessageInitializer";

// Create QueryClient outside component to prevent re-creation
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function App() {
  const [isReady, setIsReady] = useState(true);

  if (!isReady) {
    return null;
  }

  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ConfigProvider locale={zhCN}>
          <AntApp>
            <AppContent />
          </AntApp>
        </ConfigProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
}

function AppContent() {
  // Get context-aware message instance from AntApp
  const { message: messageApi } = AntApp.useApp();

  // Initialize message instance for dataProvider
  useMessageInitializer();

  return (
    <AuthProvider>
      <Refine
              dataProvider={dataProvider}
              authProvider={authProvider}
              options={{
                reactQuery: {
                  clientConfig: queryClient,
                },
                notification: {
                  success: (msg: unknown) => {
                    if (typeof msg === "string") {
                      messageApi.success(msg);
                    }
                  },
                  error: (msg: unknown) => {
                    const errorMsg = typeof msg === "string" ? msg : "操作失败";
                    messageApi.error(errorMsg);
                  },
                },
              }}
              resources={[
                {
                  name: "dashboard",
                  list: "/dashboard",
                },
                {
                  name: "merchant",
                  list: "/merchants",
                },
                {
                  name: "couponTemplate",
                  list: "/coupon-templates",
                },
                {
                  name: "order",
                  list: "/orders",
                },
                {
                  name: "settlement",
                  list: "/settlements",
                },
                {
                  name: "news",
                  list: "/news",
                },
                {
                  name: "redemption",
                  list: "/redemptions",
                },
                {
                  name: "user",
                  list: "/users",
                },
                {
                  name: "admin",
                  list: "/admins",
                },
                {
                  name: "role",
                  list: "/roles",
                },
              ]}
            >
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/unauthorized" element={<SessionExpiredPage />} />
                <Route path="/" element={<AdminLayout />}>
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="dashboard" element={<DashboardPage />} />
                  <Route path="merchants" element={<MerchantListPage />} />
                  <Route path="merchants/:id" element={<MerchantDetailPage />} />
                  <Route path="coupon-templates" element={<TemplateListPage />} />
                  <Route path="coupon-templates/:id" element={<TemplateDetailPage />} />
                  <Route path="orders" element={<OrderListPage />} />
                  <Route path="orders/:id" element={<OrderDetailPage />} />
                  <Route path="settlements" element={<SettlementListPage />} />
                  <Route path="settlements/:id" element={<SettlementDetailPage />} />
                  <Route path="news" element={<NewsListPage />} />
                  <Route path="news/:id" element={<NewsDetailPage />} />
                  <Route path="redemptions" element={<RedemptionRecordsPage />} />
                  <Route path="users" element={<UserListPage />} />
                  <Route path="users/:id" element={<UserDetailPage />} />
                  <Route path="roles" element={<RoleListPage />} />
                  <Route path="roles/:id" element={<RoleDetailPage />} />
                  <Route path="admins" element={<AdminListPage />} />
                  <Route path="admins/:id" element={<AdminDetailPage />} />
                </Route>
                <Route path="/404" element={<NotFoundPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Refine>
          </AuthProvider>
  );
}

export default App;
