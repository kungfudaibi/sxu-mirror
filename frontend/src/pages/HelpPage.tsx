import { useEffect, useState, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Typography,
  Layout,
  Menu,
  Spin,
  Card,
  Button,
  Select,
} from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { marked } from "marked";
import type { HelpDoc } from "@/lib/types";
import { loadHelpDocs, loadHelpDocContent } from "@/lib/data";

const { Title, Paragraph } = Typography;
const { Sider, Content } = Layout;

// Configure marked for safe rendering
marked.setOptions({
  breaks: true,
  gfm: true,
});

function HelpPage() {
  const { mirrorId } = useParams<{ mirrorId: string }>();
  const navigate = useNavigate();
  const [docs, setDocs] = useState<HelpDoc[]>([]);
  const [currentDoc, setCurrentDoc] = useState<HelpDoc | null>(null);
  const [rawContent, setRawContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadHelpDocs().then((loaded) => {
      setDocs(loaded);
      if (mirrorId) {
        const doc = loaded.find((d) => d.mirrorid === mirrorId);
        if (doc) setCurrentDoc(doc);
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (currentDoc) {
      setContentLoading(true);
      loadHelpDocContent(currentDoc.mirrorid).then((md) => {
        if (md) setRawContent(md);
        else setRawContent(`# ${currentDoc.title}\n\n使用说明待补充。`);
        setContentLoading(false);
      });
    }
  }, [currentDoc]);

  // Parse markdown to HTML using marked
  const htmlContent = useMemo(() => {
    if (!rawContent) return "";
    try {
      return marked.parse(rawContent) as string;
    } catch {
      return `<p>渲染错误</p>`;
    }
  }, [rawContent]);

  // Scroll to top when switching docs
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  }, [currentDoc]);

  const handleSelect = (id: string) => {
    const doc = docs.find((d) => d.mirrorid === id);
    if (doc) {
      setCurrentDoc(doc);
      navigate(`/help/${id}`, { replace: true });
    }
  };

  if (loading) {
    return <div style={{ textAlign: "center", padding: 80 }}><Spin size="large" /></div>;
  }

  return (
    <div style={{ padding: "24px 0" }}>
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate("/")}
        style={{ marginBottom: 16 }}
      >
        返回首页
      </Button>

      <Title level={3}>使用帮助</Title>

      {/* Mobile selector */}
      <div style={{ marginBottom: 16, display: "none" }} className="mobile-help-select">
        <Select
          style={{ width: "100%" }}
          value={currentDoc?.mirrorid}
          onChange={handleSelect}
          options={docs.map((d) => ({ value: d.mirrorid, label: d.mirrorid }))}
        />
      </div>

      <Layout style={{ background: "transparent" }}>
        <Sider
          width={200}
          style={{ background: "#fff", borderRadius: 6, padding: 8 }}
          breakpoint="md"
          collapsedWidth={0}
        >
          <Menu
            mode="inline"
            selectedKeys={currentDoc ? [currentDoc.mirrorid] : []}
            style={{ border: "none" }}
            items={docs.map((d) => ({
              key: d.mirrorid,
              label: d.mirrorid,
              onClick: () => handleSelect(d.mirrorid),
            }))}
          />
        </Sider>

        <Content style={{ paddingLeft: 24 }}>
          {contentLoading ? (
            <div style={{ textAlign: "center", padding: 40 }}>
              <Spin />
            </div>
          ) : currentDoc ? (
            <Card
              className="help-card"
              styles={{ body: { padding: "32px 40px" } }}
            >
              <div
                ref={contentRef}
                className="help-content"
                dangerouslySetInnerHTML={{ __html: htmlContent }}
              />
            </Card>
          ) : (
            <Card>
              <Paragraph type="secondary">
                请从左侧选择一个镜像查看使用帮助
              </Paragraph>
            </Card>
          )}
        </Content>
      </Layout>
    </div>
  );
}

export default HelpPage;
