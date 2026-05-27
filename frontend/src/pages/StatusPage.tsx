import { useEffect, useState } from "react";
import {
  Typography,
  Card,
  Table,
  Tag,
  Spin,
  Statistic,
  Row,
  Col,
} from "antd";
import {
  CheckCircleFilled,
  CloseCircleFilled,
  SyncOutlined,
  PauseCircleFilled,
  ClockCircleFilled,
  DatabaseOutlined,
} from "@ant-design/icons";
import type { SyncMirrorResult } from "@/lib/types";
import { loadSyncStatus } from "@/lib/data";

const { Title, Text } = Typography;

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  success: { label: "正常", color: "success", icon: <CheckCircleFilled /> },
  failed: { label: "异常", color: "error", icon: <CloseCircleFilled /> },
  syncing: { label: "同步中", color: "processing", icon: <SyncOutlined spin /> },
  paused: { label: "暂停", color: "warning", icon: <PauseCircleFilled /> },
  pending: { label: "待同步", color: "default", icon: <ClockCircleFilled /> },
  skipped: { label: "已跳过", color: "default", icon: <PauseCircleFilled /> },
};

function StatusPage() {
  const [data, setData] = useState<SyncMirrorResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSyncStatus().then((status) => {
      if (status) setData(status.mirrors);
      setLoading(false);
    });
  }, []);

  const columns = [
    {
      title: "镜像",
      dataIndex: "name",
      key: "name",
      render: (name: string) => <Text strong>{name}</Text>,
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (status: string) => {
        const s = STATUS_MAP[status] || STATUS_MAP.pending;
        return (
          <Tag icon={s.icon} color={s.color}>
            {s.label}
          </Tag>
        );
      },
    },
    {
      title: "大小",
      dataIndex: "size",
      key: "size",
      width: 120,
      render: (size: string) => size || "-",
    },
    {
      title: "同步耗时",
      dataIndex: "duration",
      key: "duration",
      width: 120,
      render: (d: string) => d || "-",
    },
    {
      title: "最近更新",
      dataIndex: "last_update",
      key: "last_update",
      width: 200,
      render: (t: string) => {
        if (!t) return "-";
        const d = new Date(t);
        return d.toLocaleString("zh-CN");
      },
    },
    {
      title: "错误信息",
      dataIndex: "error",
      key: "error",
      render: (err: string) =>
        err ? <Text type="danger">{err}</Text> : "-",
    },
  ];

  const stats = {
    total: data.length,
    success: data.filter((d) => d.status === "success").length,
    failed: data.filter((d) => d.status === "failed").length,
    syncing: 0,
  };

  if (loading) {
    return <div style={{ textAlign: "center", padding: 80 }}><Spin size="large" /></div>;
  }

  return (
    <div style={{ padding: "24px 0" }}>
      <Title level={3}>同步状态</Title>

      {/* Stats cards */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="镜像总数"
              value={stats.total}
              prefix={<DatabaseOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="正常"
              value={stats.success}
              valueStyle={{ color: "#52c41a" }}
              prefix={<CheckCircleFilled />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="异常"
              value={stats.failed}
              valueStyle={{ color: "#ff4d4f" }}
              prefix={<CloseCircleFilled />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="同步中"
              value={stats.syncing}
              valueStyle={{ color: "#1890ff" }}
              prefix={<SyncOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Sync table */}
      <Card>
        <Table
          dataSource={data}
          columns={columns}
          rowKey="name"
          pagination={false}
          size="middle"
        />
      </Card>
    </div>
  );
}

export default StatusPage;
