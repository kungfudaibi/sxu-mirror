import { Routes, Route } from "react-router-dom";
import { Layout } from "antd";
import NavBar from "@/components/NavBar";
import FooterBar from "@/components/FooterBar";
import HomePage from "@/pages/HomePage";
import MirrorPage from "@/pages/MirrorPage";
import HelpPage from "@/pages/HelpPage";
import StatusPage from "@/pages/StatusPage";
import DashboardPage from "@/pages/DashboardPage";
import AboutPage from "@/pages/AboutPage";

const { Content } = Layout;

function App() {
  return (
    <Layout style={{ minHeight: "100vh", background: "#f5f5f5" }}>
      <NavBar />
      <Content style={{ padding: "0 24px", maxWidth: 1200, margin: "0 auto", width: "100%" }}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/mirror/:name" element={<MirrorPage />} />
          <Route path="/help" element={<HelpPage />} />
          <Route path="/help/:mirrorId" element={<HelpPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/status" element={<StatusPage />} />
          <Route path="/about" element={<AboutPage />} />
        </Routes>
      </Content>
      <FooterBar />
    </Layout>
  );
}

export default App;
