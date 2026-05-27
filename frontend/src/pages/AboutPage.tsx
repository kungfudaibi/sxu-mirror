import { Typography, Card, Space, Image } from "antd";
import {
  TeamOutlined,
  GithubOutlined,
  MailOutlined,
  QqOutlined,
  GlobalOutlined,
} from "@ant-design/icons";

const { Title, Paragraph, Text } = Typography;

function AboutPage() {
  return (
    <div style={{ padding: "24px 0", maxWidth: 800, margin: "0 auto" }}>
      {/* Logo & Title */}
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <Image
          src="/sxuosa-logo.png"
          alt="山西大学开源软件协会"
          width={128}
          preview={false}
          style={{ marginBottom: 16 }}
        />
        <Title level={2} style={{ color: "#0b5e8a", margin: 0 }}>
          山西大学开源软件协会
        </Title>
        <Text type="secondary" style={{ fontSize: 15 }}>
          Shanxi University Open Source Software Association
        </Text>
      </div>

      {/* About Section */}
      <Card style={{ marginBottom: 24 }}>
        <Title level={4}>
          <TeamOutlined style={{ marginRight: 8 }} />
          关于我们
        </Title>
        <Paragraph style={{ fontSize: 15, lineHeight: 1.8 }}>
          {/* TODO: 在此填写协会介绍 */}
          山西大学开源软件协会（SXUOSA）是山西大学的学生社团组织，致力于在校园内推广开源文化、开源技术与开源精神。
        </Paragraph>
      </Card>

      {/* Mission Section */}
      <Card style={{ marginBottom: 24 }}>
        <Title level={4}>
          <GlobalOutlined style={{ marginRight: 8 }} />
          我们的使命
        </Title>
        <Paragraph style={{ fontSize: 15, lineHeight: 1.8 }}>
          {/* TODO: 在此填写协会使命 */}
          为校内师生提供高质量的开源软件镜像服务，组织开源技术分享活动，搭建开源社区交流平台。
        </Paragraph>
      </Card>

      {/* Contact Section */}
      <Card style={{ marginBottom: 24 }}>
        <Title level={4}>
          <MailOutlined style={{ marginRight: 8 }} />
          联系我们
        </Title>
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <div>
            <MailOutlined style={{ marginRight: 8, color: "#0b5e8a" }} />
            <Text strong>邮箱：</Text>
            <Text>1534779821@qq.com</Text>
          </div>
          <div>
            <QqOutlined style={{ marginRight: 8, color: "#0b5e8a" }} />
            <Text strong>QQ群：</Text>
            <Text>920218187</Text>
          </div>
          <div>
            <GithubOutlined style={{ marginRight: 8, color: "#0b5e8a" }} />
            <Text strong>GitHub：</Text>
            <a
              href="https://github.com/SXU-Opensource-Association"
              target="_blank"
              rel="noopener noreferrer"
            >
              SXU-Opensource-Association
            </a>
          </div>
          <div>
            <GlobalOutlined style={{ marginRight: 8, color: "#0b5e8a" }} />
            <Text strong>官网：</Text>
            <a
              href="https://www.sxuosa.top"
              target="_blank"
              rel="noopener noreferrer"
            >
              sxuosa.top
            </a>
          </div>
        </Space>
      </Card>

      {/* Mirror Info */}
      <Card>
        <Title level={4}>
          <GithubOutlined style={{ marginRight: 8 }} />
          关于镜像站
        </Title>
        <Paragraph style={{ fontSize: 15, lineHeight: 1.8 }}>
          本镜像站由山西大学开源软件协会维护运行，仅对校园网内网提供服务。
          项目代码开源在 GitHub 上，欢迎贡献。
        </Paragraph>
        <Space>
          <a
            href="https://github.com/SXU-Opensource-Association/sxu-mirror"
            target="_blank"
            rel="noopener noreferrer"
          >
            <GithubOutlined /> sxu-mirror
          </a>
          <a
            href="https://github.com/SXU-Opensource-Association/sxu-mirror"
            target="_blank"
            rel="noopener noreferrer"
          >
            <GithubOutlined /> sxusync
          </a>
        </Space>
      </Card>
    </div>
  );
}

export default AboutPage;
