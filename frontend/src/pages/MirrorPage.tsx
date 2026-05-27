import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Typography, Card, Button, Space, Spin, Descriptions, Tag, Alert } from "antd";
import { ArrowLeftOutlined, CopyOutlined, FolderOpenOutlined, CheckCircleFilled, CloseCircleFilled } from "@ant-design/icons";
import type { Mirror } from "@/lib/types";
import { loadMirrors } from "@/lib/data";

const { Title, Paragraph } = Typography;

function MirrorPage() {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const [mirror, setMirror] = useState<Mirror | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadMirrors().then((mirrors) => {
      const found = mirrors.find((m) => m.name === name);
      setMirror(found || null);
      setLoading(false);
    });
  }, [name]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return <div style={{ textAlign: "center", padding: 80 }}><Spin size="large" /></div>;
  }

  if (!mirror) {
    return (
      <Card style={{ marginTop: 24, textAlign: "center" }}>
        <Title level={4}>镜像未找到</Title>
        <Button type="primary" onClick={() => navigate("/")}>
          返回镜像列表
        </Button>
      </Card>
    );
  }

  // Generate mirror source config based on mirror type
  const BASE = window.location.origin;
  const mirrorSources: Record<string, { label: string; config: string }> = {
    ubuntu: {
      label: "Ubuntu 22.04 /etc/apt/sources.list",
      config: `deb ${BASE}/ubuntu/ jammy main restricted universe multiverse\ndeb ${BASE}/ubuntu/ jammy-updates main restricted universe multiverse\ndeb ${BASE}/ubuntu/ jammy-security main restricted universe multiverse`,
    },
    debian: {
      label: "Debian 12 /etc/apt/sources.list",
      config: `deb ${BASE}/debian/ bookworm main contrib non-free\ndeb ${BASE}/debian/ bookworm-updates main contrib non-free\ndeb ${BASE}/debian/ bookworm-security main contrib non-free`,
    },
    archlinux: {
      label: "/etc/pacman.d/mirrorlist",
      config: `Server = ${BASE}/archlinux/$repo/os/$arch`,
    },
    alpine: {
      label: "/etc/apk/repositories",
      config: `${BASE}/alpine/v3.20/main\n${BASE}/alpine/v3.20/community`,
    },
  };

  const source = mirrorSources[mirror.name];

  return (
    <div style={{ padding: "24px 0" }}>
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate("/")}
        style={{ marginBottom: 16 }}
      >
        返回镜像列表
      </Button>

      <Card>
        <Space direction="vertical" style={{ width: "100%" }} size={16}>
          <Space>
            <Title level={3} style={{ margin: 0 }}>
              {mirror.name}
            </Title>
            {mirror.status === "success" && (
              <Tag icon={<CheckCircleFilled />} color="success">正常</Tag>
            )}
            {mirror.status === "failed" && (
              <Tag icon={<CloseCircleFilled />} color="error">异常</Tag>
            )}
          </Space>

          <Paragraph type="secondary" style={{ fontSize: 15 }}>
            {mirror.desc}
          </Paragraph>

          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="镜像名称">{mirror.name}</Descriptions.Item>
            <Descriptions.Item label="本地路径">{mirror.url}</Descriptions.Item>
            {mirror.size && (
              <Descriptions.Item label="占用空间">{mirror.size}</Descriptions.Item>
            )}
            {mirror.last_update && (
              <Descriptions.Item label="最近更新">{mirror.last_update}</Descriptions.Item>
            )}
          </Descriptions>

          {/* Mirror source config */}
          {source && (
            <div>
              <Title level={5}>{source.label}</Title>
              <pre
                style={{
                  background: "#f6f8fa",
                  padding: 16,
                  borderRadius: 6,
                  overflowX: "auto",
                  fontSize: 13,
                  position: "relative",
                }}
              >
                {source.config}
                <Button
                  type="text"
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={() => handleCopy(source.config)}
                  style={{ position: "absolute", top: 8, right: 8 }}
                >
                  {copied ? "已复制" : "复制"}
                </Button>
              </pre>
            </div>
          )}

          <Card size="small" title="📂 可用文件" style={{ background: "#fafafa" }}>
            <Paragraph>
              点击下方链接浏览已同步的实际文件：
            </Paragraph>
            <a href={`/files/${mirror.name}/`} target="_blank" rel="noopener noreferrer">
              <Button type="primary" icon={<FolderOpenOutlined />}>
                浏览 {mirror.name} 文件目录
              </Button>
            </a>
          </Card>

          <Alert
            type="info"
            showIcon
            message="使用须知"
            description={`本镜像站仅限山西大学校园网内使用。
镜像源地址：${BASE}
配置镜像源前请确保你处于校园网环境中。`}
          />
        </Space>
      </Card>
    </div>
  );
}

export default MirrorPage;
