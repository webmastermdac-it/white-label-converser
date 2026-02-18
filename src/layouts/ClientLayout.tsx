import { Outlet } from "react-router-dom";
import ClientSidebar from "@/components/ClientSidebar";

const ClientLayout = () => {
  return (
    <div className="flex min-h-screen bg-background">
      <ClientSidebar />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default ClientLayout;
