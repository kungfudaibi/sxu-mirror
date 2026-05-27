import { useEffect, useState } from "react";
import { Input, Typography, Card, Row, Col, Tag, Spin, Space, Image } from "antd";
import { useNavigate } from "react-router-dom";
import {
  SearchOutlined,
  FolderOpenOutlined,
  CheckCircleFilled,
  SyncOutlined,
  CloseCircleFilled,
  PauseCircleFilled,
} from "@ant-design/icons";
import type { Mirror } from "@/lib/types";
import { loadMirrors, loadSyncStatus } from "@/lib/data";

const { Title, Text } = Typography;

// Mirror categories
const CATEGORIES: Record<string, { label: string; color: string }> = {
  "linux-distro": { label: "Linux 发行版", color: "#0b5e8a" },
  "dev-tools": { label: "开发工具", color: "#52c41a" },
  "language": { label: "编程语言", color: "#722ed1" },
  "storage": { label: "数据存储", color: "#fa8c16" },
  "desktop": { label: "桌面环境", color: "#eb2f96" },
  "other": { label: "其他", color: "#8c8c8c" },
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  success: <CheckCircleFilled style={{ color: "#52c41a" }} />,
  syncing: <SyncOutlined spin style={{ color: "#1890ff" }} />,
  failed: <CloseCircleFilled style={{ color: "#ff4d4f" }} />,
  paused: <PauseCircleFilled style={{ color: "#faad14" }} />,
};

function HomePage() {
  const [mirrors, setMirrors] = useState<Mirror[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([loadMirrors(), loadSyncStatus()]).then(
      ([mirrorData, syncStatus]) => {
        // Merge sync status into mirror list
        if (syncStatus) {
          const statusMap = new Map(
            syncStatus.mirrors.map((m) => [m.name, m])
          );
          mirrorData.forEach((m) => {
            const s = statusMap.get(m.name);
            if (s) {
              m.status = s.status;
              m.last_update = s.last_update;
              m.size = s.size;
            }
          });
        }
        setMirrors(mirrorData);
        setLoading(false);
      }
    );
  }, []);

  const filtered = mirrors.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.desc.toLowerCase().includes(search.toLowerCase())
  );

  // Group by category
  const grouped = filtered.reduce<Record<string, Mirror[]>>((acc, m) => {
    const cat = m.category || "other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(m);
    return acc;
  }, {});

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: "24px 0" }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <Image
          src="/logo-256.png"
          alt="山西大学开源软件协会"
          width={96}
          preview={false}
          style={{ marginBottom: 12 }}
        />
        <Title level={2} style={{ color: "#0b5e8a", margin: 0 }}>
          山西大学开源软件镜像站
        </Title>
        <Text type="secondary" style={{ fontSize: 16 }}>
          致力于为校内用户提供高质量的开源软件镜像服务
        </Text>
      </div>

      {/* Search */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
        <Input
          size="middle"
          prefix={<SearchOutlined style={{ color: "#bfbfbf", fontSize: 15 }} />}
          placeholder="搜索镜像..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            maxWidth: 400,
            width: "100%",
            height: 38,
          }}
        />
      </div>

      {/* Mirror List by Category */}
      {Object.entries(grouped).map(([cat, items]) => (
        <div key={cat} style={{ marginBottom: 32 }}>
          <Title level={4} style={{ marginBottom: 12, color: CATEGORIES[cat]?.color || "#333" }}>
            {CATEGORIES[cat]?.label || cat}
            <Text type="secondary" style={{ fontSize: 14, marginLeft: 8 }}>
              ({items.length})
            </Text>
          </Title>
          <Row gutter={[12, 12]} className="mirror-grid">
            {items.map((mirror) => (
              <Col xs={24} sm={12} md={8} lg={6} key={mirror.name}>
                <Card
                  hoverable
                  className="mirror-card"
                  style={{ height: "100%" }}
                  onClick={() => navigate(`/mirror/${mirror.name}`)}
                  actions={[
                    <FolderOpenOutlined
                      key="files"
                      style={{ color: "#0b5e8a", fontSize: 16 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(`/files/${mirror.name}/`, "_blank");
                      }}
                      title="浏览文件"
                    />,
                  ]}
                >
                  <Card.Meta
                    title={
                      <Space>
                        <Text strong style={{ fontSize: 15 }}>
                          {mirror.name}
                        </Text>
                        {mirror.status && (
                          <Tag icon={STATUS_ICONS[mirror.status] || STATUS_ICONS.pending} style={{ margin: 0 }}>
                            {mirror.status === "success"
                              ? "正常"
                              : mirror.status === "syncing"
                                ? "同步中"
                                : mirror.status === "failed"
                                  ? "异常"
                                  : "暂停"}
                          </Tag>
                        )}
                      </Space>
                    }
                    description={
                      <Space direction="vertical" size={4}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {mirror.desc}
                        </Text>
                        {mirror.size && (
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            {mirror.size}
                          </Text>
                        )}
                      </Space>
                    }
                  />
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      ))}

      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: 40 }}>
          <Text type="secondary">未找到匹配的镜像</Text>
        </div>
      )}
    </div>
  );
}

export default HomePage;
