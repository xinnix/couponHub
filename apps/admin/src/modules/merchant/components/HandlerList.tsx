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
    nickname?: string;
    phone?: string;
    avatar?: string;
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
      width: 120,
    },
    {
      title: "手机号",
      dataIndex: "phone",
      key: "phone",
      width: 150,
    },
    {
      title: "状态",
      dataIndex: "isActive",
      key: "isActive",
      width: 100,
      align: "center" as const,
      render: (isActive: boolean) => (
        <Tag color={isActive ? "success" : "error"}>
          {isActive ? "启用" : "禁用"}
        </Tag>
      ),
    },
    {
      title: "关联用户",
      key: "users",
      width: 200,
      render: (_: any, record: Handler) => {
        if (!record.users || record.users.length === 0) {
          return <Tag color="default">未关联</Tag>;
        }
        return (
          <Space direction="vertical" size="small">
            {record.users.map((user) => {
              // 优先显示昵称，其次手机号，最后显示用户ID前8位
              const displayName = user.nickname || user.phone || `用户 ${user.id.slice(0, 8)}`;
              return (
                <Tag key={user.id} color="blue">
                  {displayName}
                </Tag>
              );
            })}
          </Space>
        );
      },
    },
    {
      title: "创建时间",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 180,
      render: (date: Date) => new Date(date).toLocaleString("zh-CN"),
    },
    {
      title: "操作",
      key: "actions",
      width: 200,
      fixed: "right" as const,
      render: (_: any, record: Handler) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
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
            size="small"
            icon={record.isActive ? <StopOutlined /> : <CheckOutlined />}
            onClick={() => toggleActive.mutate(record.id)}
          >
            {record.isActive ? "禁用" : "启用"}
          </Button>
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => {
              Modal.confirm({
                title: "确认删除",
                content: (
                  <div>
                    <p>确定要删除核销员 "{record.name}" 吗？</p>
                    <p style={{ color: '#8c8c8c', fontSize: 12, marginTop: 8 }}>
                      删除后核销员将无法继续核销优惠券，但历史记录将保留
                    </p>
                  </div>
                ),
                okText: '确认删除',
                cancelText: '取消',
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
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 16, fontWeight: 500, color: '#262626' }}>
          共 {handlers.length || 0} 位核销员
        </div>
        <Button
          type="primary"
          icon={<EditOutlined />}
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
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条`,
          style: { marginTop: 16 }
        }}
        scroll={{ x: 1000 }}
        bordered
        size="middle"
      />

      <Modal
        title={editingHandler ? "编辑核销员" : "添加核销员"}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
        centered
        destroyOnClose
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
