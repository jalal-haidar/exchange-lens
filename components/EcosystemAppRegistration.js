"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";

export default function EcosystemAppRegistration() {
  const { user, loading, supabase } = useAuth();
  const attemptedUserId = useRef(null);

  useEffect(() => {
    if (loading || !user || !supabase || attemptedUserId.current === user.id) {
      return;
    }

    attemptedUserId.current = user.id;
    let cancelled = false;

    supabase
      .rpc("register_lifelens_app", {
        p_app_key: "exchange",
        p_entrypoint: "direct_open",
      })
      .then(({ error }) => {
        if (error && !cancelled) {
          console.warn("[LifeLens] Exchange registration will retry later.", {
            code: error.code,
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [loading, supabase, user]);

  return null;
}
