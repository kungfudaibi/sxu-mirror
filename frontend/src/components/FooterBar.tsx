import { Layout, Typography, Space } from "antd";

const { Footer } = Layout;
const { Text, Link } = Typography;

function FooterBar() {
  return (
    <Footer
      style={{
        textAlign: "center",
        background: "#fff",
        borderTop: "1px solid #e8e8e8",
      }}
    >
      <Space direction="vertical" size={4}>
        <Text type="secondary">
          山西大学开源软件协会 维护运行
        </Text>
        <Text type="secondary" style={{ fontSize: 12 }}>
          致力于为校内用户提供高质量的开源软件镜像服务
        </Text>
        <Space size={16}>
          <Link
            href="https://www.sxuosa.top"
            target="_blank"
            type="secondary"
            style={{ fontSize: 12 }}
          >
            开源软件协会
          </Link>
          <Link
            href="https://github.com/SXU-Opensource-Association/sxu-mirror"
            target="_blank"
            type="secondary"
            style={{ fontSize: 12 }}
          >
            GitHub
          </Link>
        </Space>
      </Space>
    </Footer>
  );
}

export default FooterBar;
