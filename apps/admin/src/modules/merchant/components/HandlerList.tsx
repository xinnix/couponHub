import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, Button, Tag, Space, Modal, App } from "antd";
import { EditOutlined, DeleteOutlined, CheckOutlined, StopOutlined } from "@ant-design/icons";
import { useState } from "react";
import { HandlerForm } from "./HandlerForm";
import { trpcClient } from "../../../shared/dataProvider";

interface Handler {
  id: string;
  name: string;
  phone: string;
  merchantId: string;
  isActive: boolean;
  createdAt: Date;
  users?: Array<{
    id: string;
    nickname: string;
    avatar: string;
  }>;
}

interface HandlerListProps {
  merchantId: string;
}

export const HandlerList = ({ merchantId }: HandlerListProps) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [editingHandler, setEditingHandler] = useState<Handler | null>(null);
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  const { data: handlers = [], isLoading } = useQuery({
    queryKey: ["handler", "getByMerchant", merchantId],
    queryFn: () => (trpcClient as any).handler.getByMerchant.query({ merchantId }),
  });

  const toggleActive = useMutation({
    mutationFn: (id: string) => (trpcClient as any).handler.toggleActive.mutate({ id }),
    onSuccess: () => {
      message.success("操作成功");
      queryClient.invalidateQueries({ queryKey: ["handler"] });
    },
  });

  const deleteHandler = useMutation({
    mutationFn: (id: string) => (trpcClient as any).handler.delete.mutate({ id }),
    onSuccess: () => {
      message.success("删除成功");
      queryClient.invalidateQueries({ queryKey: ["handler"] });
    },
  });

  const columns = [
    {
      title: "姓名",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "手机号",
      dataIndex: "phone",
      key: "phone",
    },
    {
      title: "状态",
      dataIndex: "isActive",
      key: "isActive",
      render: (isActive: boolean) => (
        <Tag color={isActive ? "success" : "error"}>
          {isActive ? "启用" : "禁用"}
        </Tag>
      ),
    },
    {
      title: "关联用户",
      key: "users",
      render: (_: any, record: Handler) => {
        if (!record.users || record.users.length === 0) {
          return <Tag color="default">未关联</Tag>;
        }
        return (
          <Space>
            {record.users.map((user) => (
              <Tag key={user.id} color="blue">
                {user.nickname || user.id}
              </Tag>
            ))}
          </Space>
        );
      },
    },
    {
      title: "创建时间",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: Date) => new Date(date).toLocaleString("zh-CN"),
    },
    {
      title: "操作",
      key: "actions",
      render: (_: any, record: Handler) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => {
              setEditingHandler(record);
              setModalVisible(true);
            }}
          >
            编辑
          </Button>
          <Button
            type="link"
            icon={record.isActive ? <StopOutlined /> : <CheckOutlined />}
            onClick={() => toggleActive.mutate(record.id)}
          >
            {record.isActive ? "禁用" : "启用"}
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => {
              Modal.confirm({
                title: "确认删除",
                content: `确定要删除核销员 "${record.name}" 吗？`,
                onOk: () => deleteHandler.mutate(record.id),
              });
            }}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, textAlign: "right" }}>
        <Button
          type="primary"
          onClick={() => {
            setEditingHandler(null);
            setModalVisible(true);
          }}
        >
          添加核销员
        </Button>
      </div>

      <Table
        dataSource={handlers}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title={editingHandler ? "编辑核销员" : "添加核销员"}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
      >
        <HandlerForm
          merchantId={merchantId}
          handler={editingHandler}
          onSuccess={() => {
            setModalVisible(false);
            queryClient.invalidateQueries({ queryKey: ["handler"] });
          }}
        />
      </Modal>
    </div>
  );
};
