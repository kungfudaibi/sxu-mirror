import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Card,
  Col,
  Empty,
  List,
  Progress,
  Row,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
} from "antd";
import {
  CheckCircleFilled,
  ClockCircleFilled,
  CloseCircleFilled,
  FileTextOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import type { SyncMirrorResult } from "@/lib/types";
import type { ActiveSyncProgress, SyncProgress } from "@/lib/monitor";
import { loadSyncStatus } from "@/lib/data";
import { loadSyncProgress } from "@/lib/monitor";

const { Title, Text, Paragraph } = Typography;

const POLL_INTERVAL_MS = 2500;

function formatTime(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN");
}

function normalizeProgress(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function resultColumns() {
  return [
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
      render: (status: SyncMirrorResult["status"]) => {
        const failed = status === "failed";
        return (
          <Tag
            color={failed ? "error" : "success"}
            icon={failed ? <CloseCircleFilled /> : <CheckCircleFilled />}
          >
            {failed ? "失败" : "已完成"}
          </Tag>
        );
      },
    },
    {
      title: "大小",
      dataIndex: "size",
      key: "size",
      width: 120,
      render: (size?: string) => size || "-",
    },
    {
      title: "耗时",
      dataIndex: "duration",
      key: "duration",
      width: 120,
      render: (duration?: string) => duration || "-",
    },
    {
      title: "更新时间",
      dataIndex: "last_update",
      key: "last_update",
      width: 200,
      render: (value?: string) => formatTime(value),
    },
    {
      title: "错误信息",
      dataIndex: "error",
      key: "error",
      render: (error?: string) => error ? <Text type="danger">{error}</Text> : "-",
    },
  ];
}

function ActiveSyncCard({ item }: { item: ActiveSyncProgress }) {
  const percent = normalizeProgress(item.progress_pct);

  return (
    <Card
      title={
        <Space>
          <Text strong>{item.name}</Text>
          <Tag color={item.type === "git" ? "purple" : "blue"}>{item.type}</Tag>
          <Tag color="processing" icon={<SyncOutlined spin />}>
            PID {item.pid}
          </Tag>
        </Space>
      }
      style={{ height: "100%" }}
    >
      <Progress percent={percent} status="active" />
      <Row gutter={[16, 12]} style={{ marginTop: 12 }}>
        <Col xs={12} md={6}>
          <Statistic
            title="已传输"
            value={item.transferred_bytes || "-"}
            valueStyle={{ fontSize: 18 }}
          />
        </Col>
        <Col xs={12} md={6}>
          <Statistic
            title="总计"
            value={item.total_bytes || "-"}
            valueStyle={{ fontSize: 18 }}
          />
        </Col>
        <Col xs={12} md={6}>
          <Statistic
            title="速度"
            value={item.speed || "-"}
            valueStyle={{ fontSize: 18 }}
          />
        </Col>
        <Col xs={12} md={6}>
          <Statistic
            title="剩余"
            value={item.eta || "-"}
            valueStyle={{ fontSize: 18 }}
          />
        </Col>
      </Row>
      <Paragraph
        ellipsis={{ rows: 2, tooltip: item.current_file || "暂无文件信息" }}
        style={{ marginTop: 16, marginBottom: 0 }}
      >
        <Text type="secondary">当前文件：</Text>
        {item.current_file || "-"}
      </Paragraph>
      <Text type="secondary">开始时间：{formatTime(item.started_at)}</Text>
    </Card>
  );
}

function DashboardPage() {
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  const [history, setHistory] = useState<SyncMirrorResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastError, setLastError] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function refresh() {
      const [progressData, statusData] = await Promise.all([
        loadSyncProgress(),
        loadSyncStatus(),
      ]);

      if (!mounted) return;
      setProgress(progressData);
      setLastError(!progressData);
      if (statusData) setHistory(statusData.mirrors);
      setLoading(false);
    }

    refresh();
    const timer = window.setInterval(refresh, POLL_INTERVAL_MS);
    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, []);

  const activeNames = useMemo(
    () => new Set(progress?.active.map((item) => item.name) || []),
    [progress],
  );

  const completed = useMemo(() => {
    if (progress?.completed) return progress.completed;
    return history.filter(
      (item) =>
        (item.status === "success" || item.status === "skipped") &&
        !activeNames.has(item.name),
    );
  }, [activeNames, history, progress]);

  const failed = useMemo(() => {
    if (progress?.failed) return progress.failed;
    return history.filter((item) => item.status === "failed");
  }, [history, progress]);

  const queue = progress?.queue || history
    .filter((item) => item.status === "pending" && !activeNames.has(item.name))
    .map((item) => item.name);

  const active = progress?.active || [];

  if (loading) {
    return <div style={{ textAlign: "center", padding: 80 }}><Spin size="large" /></div>;
  }

  return (
    <div style={{ padding: "24px 0" }}>
      <Space align="baseline" style={{ width: "100%", justifyContent: "space-between" }}>
        <Title level={3}>实时同步</Title>
        <Text type="secondary">更新于 {formatTime(progress?.updated_at)}</Text>
      </Space>

      {lastError && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message="暂未读取到实时进度"
          description="请确认 scripts/sync-monitor.sh 已在服务器运行并写入 public/data/sync-progress.json。"
        />
      )}

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic title="同步中" value={active.length} prefix={<SyncOutlined />} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic title="队列中" value={queue.length} prefix={<ClockCircleFilled />} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="已完成"
              value={completed.length}
              valueStyle={{ color: "#52c41a" }}
              prefix={<CheckCircleFilled />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="失败"
              value={failed.length}
              valueStyle={{ color: "#ff4d4f" }}
              prefix={<CloseCircleFilled />}
            />
          </Card>
        </Col>
      </Row>

      <Title level={4}>当前同步</Title>
      {active.length > 0 ? (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          {active.map((item) => (
            <Col xs={24} key={`${item.name}-${item.pid}`}>
              <ActiveSyncCard item={item} />
            </Col>
          ))}
        </Row>
      ) : (
        <Card style={{ marginBottom: 24 }}>
          <Empty description="当前没有正在同步的任务" />
        </Card>
      )}

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>
          <Card title="同步队列" style={{ height: "100%" }}>
            {queue.length > 0 ? (
              <List
                dataSource={queue}
                renderItem={(name, index) => (
                  <List.Item>
                    <Space>
                      <Tag color="default">#{index + 1}</Tag>
                      <Text>{name}</Text>
                    </Space>
                  </List.Item>
                )}
              />
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="队列为空" />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={16}>
          <Card title="已完成 / 失败">
            <Table
              dataSource={[...failed, ...completed]}
              columns={resultColumns()}
              rowKey={(item) => `${item.name}-${item.status}-${item.timestamp}`}
              pagination={{ pageSize: 8, hideOnSinglePage: true }}
              size="middle"
            />
          </Card>
        </Col>
      </Row>

      {progress?.logs && progress.logs.length > 0 && (
        <Card
          title={<Space><FileTextOutlined />实时日志</Space>}
          style={{ marginTop: 16 }}
        >
          <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
            {progress.logs.join("\n")}
          </pre>
        </Card>
      )}
    </div>
  );
}

export default DashboardPage;
