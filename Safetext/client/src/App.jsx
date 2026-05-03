import { Navigate, Route, Routes } from "react-router-dom";
import { AppProviders } from "./hooks/AppProviders.jsx";
import { Layout } from "./components/Layout.jsx";
import { LandingPage } from "./pages/LandingPage.jsx";
import { ChatPage } from "./pages/ChatPage.jsx";
import { DashboardPage } from "./pages/DashboardPage.jsx";
import { DocsPage } from "./pages/DocsPage.jsx";

export default function App() {
  return (
    <AppProviders>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/docs" element={<DocsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </AppProviders>
  );
}
