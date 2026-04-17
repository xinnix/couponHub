import { Form, Input, Button, Card, App } from "antd";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../shared/auth/AuthContext";
import { useState } from "react";
import "./LoginPage.css";

export const LoginPage = () => {
  const { login: authLogin } = useAuth();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [isLoading, setIsLoading] = useState(false);
  const { message } = App.useApp();

  const onFinish = async (values: any) => {
    setIsLoading(true);
    try {
      await authLogin(values.username, values.password);
      message.success("登录成功");
      navigate("/dashboard");
    } catch (error: any) {
      message.error(error?.message || "登录失败");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-background">
        <div className="login-card-wrapper">
          <Card className="login-card" bordered={false}>
            <div className="login-header">
              <h1>Admin</h1>
              <p>后台管理系统</p>
            </div>
            <Form
              form={form}
              name="login"
              onFinish={onFinish}
              autoComplete="off"
              size="large"
            >
              <Form.Item
                name="username"
                label="用户名"
                rules={[{ required: true, message: "请输入用户名" }]}
              >
                <Input prefix={<UserOutlined />} placeholder="用户名或邮箱" />
              </Form.Item>
              <Form.Item
                name="password"
                label="密    码"
                rules={[{ required: true, message: "请输入密码" }]}
              >
                <Input.Password prefix={<LockOutlined />} placeholder="密码" />
              </Form.Item>
              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  loading={isLoading}
                >
                  登录
                </Button>
              </Form.Item>
            </Form>
            <div className="login-footer">
              <div
                style={{
                  marginTop: 16,
                  padding: "16px",
                  background: "#f5f5f5",
                  borderRadius: "8px",
                }}
              >
                <h4 style={{ marginBottom: 12, color: "#666", fontSize: 14 }}>
                  管理端测试账号 (密码: password123)
                </h4>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    fontSize: 12,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "8px",
                      background: "#fff",
                      borderRadius: "4px",
                    }}
                  >
                    <span style={{ fontWeight: 500 }}>超级管理员</span>
                    <span style={{ color: "#1890ff" }}>superadmin</span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "8px",
                      background: "#fff",
                      borderRadius: "4px",
                    }}
                  >
                    <span style={{ fontWeight: 500 }}>管理员</span>
                    <span style={{ color: "#1890ff" }}>admin</span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "8px",
                      background: "#fff",
                      borderRadius: "4px",
                    }}
                  >
                    <span style={{ fontWeight: 500 }}>访客</span>
                    <span style={{ color: "#1890ff" }}>viewer</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
