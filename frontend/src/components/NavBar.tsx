import { useNavigate, useLocation } from "react-router-dom";
import { Layout, Menu, Typography, Space } from "antd";
import {
  AppstoreOutlined,
  QuestionCircleOutlined,
  DashboardOutlined,
  InfoCircleOutlined,
  SyncOutlined,
} from "@ant-design/icons";

const { Header } = Layout;
const { Text } = Typography;

function NavBar() {
  const navigate = useNavigate();
  const location = useLocation();

  const currentKey =
    location.pathname === "/"
      ? "home"
      : location.pathname.startsWith("/help")
        ? "help"
        : location.pathname.startsWith("/dashboard")
          ? "dashboard"
          : location.pathname.startsWith("/status")
            ? "status"
            : location.pathname.startsWith("/about")
              ? "about"
              : "home";

  return (
    <Header
      style={{
        background: "#fff",
        borderBottom: "1px solid #e8e8e8",
        display: "flex",
        alignItems: "center",
        padding: "0 24px",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}
    >
      <Space
        style={{ cursor: "pointer", marginRight: 32 }}
        onClick={() => navigate("/")}
      >
        <Text strong style={{ fontSize: 18, color: "#0b5e8a" }}>
          SXU Mirror
        </Text>
        <Text type="secondary" style={{ fontSize: 13 }}>
          山西大学开源软件镜像站
        </Text>
      </Space>

      <Menu
        mode="horizontal"
        selectedKeys={[currentKey]}
        style={{ flex: 1, border: "none" }}
        items={[
          {
            key: "home",
            icon: <AppstoreOutlined />,
            label: "镜像列表",
            onClick: () => navigate("/"),
          },
          {
            key: "help",
            icon: <QuestionCircleOutlined />,
            label: "使用帮助",
            onClick: () => navigate("/help"),
          },
          {
            key: "dashboard",
            icon: <SyncOutlined />,
            label: "实时同步",
            onClick: () => navigate("/dashboard"),
          },
          {
            key: "status",
            icon: <DashboardOutlined />,
            label: "同步状态",
            onClick: () => navigate("/status"),
          },
          {
            key: "about",
            icon: <InfoCircleOutlined />,
            label: "关于",
            onClick: () => navigate("/about"),
          },
        ]}
      />
    </Header>
  );
}

export default NavBar;
