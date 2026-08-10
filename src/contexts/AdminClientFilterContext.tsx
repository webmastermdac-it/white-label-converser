import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AdminClient {
  id: string;
  name: string;
  plan: string;
}

interface AdminClientFilterContextType {
  selectedClientId: string; // "all" or a client id
  setSelectedClientId: (id: string) => void;
  selectedClient: AdminClient | null;
  clients: AdminClient[];
  loading: boolean;
}

const STORAGE_KEY = "admin_selected_client_id";

const AdminClientFilterContext = createContext<AdminClientFilterContextType>({
  selectedClientId: "all",
  setSelectedClientId: () => {},
  selectedClient: null,
  clients: [],
  loading: false,
});

export const useAdminClientFilter = () => useContext(AdminClientFilterContext);

export const AdminClientFilterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedClientId, setSelected] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || "all";
    } catch {
      return "all";
    }
  });
  const [clients, setClients] = useState<AdminClient[]>([]);
  const [loading, setLoading] = useState(true);

  const setSelectedClientId = useCallback((id: string) => {
    setSelected(id);
    try {
      if (id === "all") localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // ignore storage errors
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    supabase
      .from("clients")
      .select("id, name, plan")
      .order("name")
      .then(({ data }) => {
        if (!mounted) return;
        setClients((data as AdminClient[]) || []);
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const selectedClient = clients.find((c) => c.id === selectedClientId) || null;

  return (
    <AdminClientFilterContext.Provider
      value={{ selectedClientId, setSelectedClientId, selectedClient, clients, loading }}
    >
      {children}
    </AdminClientFilterContext.Provider>
  );
};
