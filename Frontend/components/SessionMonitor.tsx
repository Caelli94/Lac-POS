"use client";

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { authService } from '@/services/authService';
import { toast } from 'sonner';

export function SessionMonitor() {
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        // Skip active check on public auth pages to avoid loop or unnecessary calls
        if (pathname === '/login' || pathname.startsWith('/register') || pathname.startsWith('/setup-password')) return;

        const checkSession = async () => {
            // CRITICAL: If offline, DO NOT validate session.
            // Network failures shouldn't be interpreted as unauthorized access.
            if (typeof window !== 'undefined' && !navigator.onLine) return;

            try {
                const user = await authService.getMe(); // Returns null if 401

                if (!user) {
                    // Session invalid!
                    clearInterval(interval);

                    toast.error("Sesión Finalizada", {
                        description: "Se ha detectado un inicio de sesión en otro dispositivo.",
                        duration: 8000,
                        id: 'session-expired-toast'
                    });

                    // Force logout to clear cookies so we don't loop on login page
                    await authService.logout();

                    router.push('/login');
                }
            } catch (error) {
                // Ignore network/unknown errors to prevent false-positive logouts
            }
        };

        // Run immediately on mount/nav (except auth pages)
        checkSession();

        // Poll every 20 seconds (Balanced security & performance)
        const interval = setInterval(checkSession, 20000);

        return () => clearInterval(interval);
    }, [pathname, router]);

    return null;
}
