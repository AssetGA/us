"use client";

import { useEffect, useState } from "react";
import type { ApiUser } from "@/lib/api";
import {
  PARTICIPATION_MODE_EVENT,
  resolveParticipationMode,
  type ParticipationMode,
} from "@/lib/participation";

export function useParticipationMode(user: ApiUser | null): ParticipationMode {
  const [mode, setMode] = useState<ParticipationMode>("customer");

  useEffect(() => {
    if (!user) return;
    setMode(resolveParticipationMode(user));
    const sync = () => setMode(resolveParticipationMode(user));
    window.addEventListener(PARTICIPATION_MODE_EVENT, sync);
    return () => window.removeEventListener(PARTICIPATION_MODE_EVENT, sync);
  }, [user]);

  return mode;
}
