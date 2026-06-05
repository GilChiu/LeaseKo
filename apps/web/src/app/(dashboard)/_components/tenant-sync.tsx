"use client";

import { useAuth, useOrganization } from "@clerk/nextjs";
import { useEffect } from "react";
import { apiFetch } from "@/lib/api";

export function TenantSync() {
  const { getToken } = useAuth();
  const { organization } = useOrganization();

  useEffect(() => {
    if (!organization) return;
    const orgName = organization.name;

    void (async () => {
      const token = await getToken();
      if (!token) return;
      await apiFetch("/tenants/sync", {
        method: "POST",
        token,
        body: JSON.stringify({ name: orgName }),
      }).catch(() => {});
    })();
  }, [organization?.id, getToken]);  // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
