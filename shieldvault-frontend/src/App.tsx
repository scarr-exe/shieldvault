import { useState } from "react";
import { useAccount } from "wagmi";
import { Shell } from "./components/Shell";
import { ConnectPage } from "./components/ConnectPage";
import { DashboardPage } from "./pages/Dashboard";
import { WrapStationPage } from "./pages/WrapStation";
import { ContributorsPage } from "./pages/Contributors";
import { PayPage } from "./pages/Pay";
import { RegistryPage } from "./pages/Registry";
import { ADDRESSES } from "./config/contracts";

type Page = "dashboard" | "wrap" | "contributors" | "pay" | "registry";

export default function App() {
  const { isConnected } = useAccount();
  const [page, setPage] = useState<Page>("dashboard");

  if (!isConnected) return <ConnectPage />;

  const content = {
    dashboard:    <DashboardPage />,
    wrap:         <WrapStationPage />,
    contributors: <ContributorsPage />,
    pay:          <PayPage />,
    registry:     <RegistryPage />,
  }[page];

  return (
    <Shell page={page} onNav={setPage} vaultAddress={ADDRESSES.vault}>
      {content}
    </Shell>
  );
}
