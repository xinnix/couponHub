import type { AuthProvider } from "@refinedev/core";
import { getTrpcClient } from "../trpc/trpcClient";

// Get shared tRPC client
const trpcClient = getTrpcClient();

export const authProvider: AuthProvider = {
  login: async ({ email, password }) => {
    try {
      console.log("authProvider: 尝试登录", email);

      // Use tRPC mutation - returns data directly
      const result = await (trpcClient as any).auth.adminLogin.mutate({
        email,
        password,
      });

      console.log("authProvider: 登录成功");

      // Store auth data
      localStorage.setItem("accessToken", result.accessToken);
      localStorage.setItem("refreshToken", result.refreshToken);
      localStorage.setItem("user", JSON.stringify(result.user));

      return Promise.resolve({
        success: true,
      });
    } catch (error: any) {
      console.error("authProvider: 登录失败", error);

      // tRPC 错误格式: error.message 包含后端返回的错误信息
      const errorMessage = error?.message || "登录失败";

      console.error("authProvider: 错误信息 -", errorMessage);

      return Promise.resolve({
        success: false,
        error: {
          name: "Login Error",
          message: errorMessage,
        },
      });
    }
  },

  check: async () => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      return Promise.resolve({
        authenticated: true,
      });
    }
    return Promise.resolve({
      authenticated: false,
      logout: true,
      redirectTo: "/login",
    });
  },

  logout: async (params: any) => {
    try {
      // Call backend logout API if refresh token is provided
      if (params?.refreshToken) {
        await (trpcClient as any).auth.logout.mutate({
          refreshToken: params.refreshToken,
        });
      }
    } catch (error: any) {
      console.error("Logout API error:", error);
      // Continue with local logout even if API fails
    }

    // Clear localStorage
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");

    return Promise.resolve({
      success: true,
      redirectTo: "/login",
    });
  },

  onError: async (error: any) => {
    // Check tRPC error structure
    const trpcCode = error?.data?.code;
    const httpStatus = error?.data?.httpStatus;
    // Also check standard HTTP error structure
    const status = error?.status || error?.statusCode;

    if (trpcCode === "UNAUTHORIZED" || httpStatus === 401 || status === 401) {
      return Promise.resolve({
        logout: true,
        redirectTo: "/login",
      });
    }
    return Promise.resolve({});
  },

  getPermissions: async () => {
    const userStr = localStorage.getItem("user");
    if (!userStr) {
      return Promise.resolve([]);
    }

    const user = JSON.parse(userStr);
    return Promise.resolve(user.permissions || []);
  },

  getIdentity: async () => {
    const userStr = localStorage.getItem("user");
    if (!userStr) {
      return Promise.reject();
    }

    const user = JSON.parse(userStr);
    return Promise.resolve({
      id: user.id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
    });
  },
};
