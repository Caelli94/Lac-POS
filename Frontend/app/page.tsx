
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/authService';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      console.log("Iniciando chequeo de autenticación...");

      // Failsafe timeout: If API hangs, redirect to login after 3s
      const timeoutId = setTimeout(() => {
        console.warn("Tiempo de espera agotado, redirigiendo a login...");
        router.replace('/login');
      }, 3000);

      try {
        const user = await authService.getMe();
        clearTimeout(timeoutId); // Clear timeout if successful

        console.log("Usuario obtenido:", user);

        if (user && user.role === 'superadmin') {
          console.log("Usuario Super Admin detectado. Redirigiendo a /admin/dashboard");
          router.replace('/admin/dashboard');
          return;
        }

        if (user && user.organization?.slug) {
          console.log("Redirigiendo a dashboard de:", user.organization.slug);
          router.replace(`/${user.organization.slug}`);
        } else {
          console.warn("Usuario no identificado o sin organización, al login.");
          router.replace('/login');
        }
      } catch (error) {
        clearTimeout(timeoutId);
        console.error("Error en checkAuth:", error);
        router.replace('/login');
      }
    };

    checkAuth();
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center bg-slate-950">
      <Loader2 className="h-10 w-10 animate-spin text-white" />
    </div>
  );
}
