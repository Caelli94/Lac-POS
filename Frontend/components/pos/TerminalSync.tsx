"use client";

import { useEffect } from "react";
import { setTerminalCookie } from "../../app/[slug]/settings/actions";

interface TerminalSyncProps {
    registerId: string;
}

export function TerminalSync({ registerId }: TerminalSyncProps) {
    useEffect(() => {
        if (!registerId || typeof window === 'undefined') return;

        // 1. Persist in localStorage (Robust identity - survives session clear)
        localStorage.setItem('lac_terminal_id', registerId);

        // 2. Ensure cookie is set (Server-side identity - for SSR)
        // We set it with 10 years duration
        setTerminalCookie(registerId);

    }, [registerId]);

    return null;
}
