'use client';

import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { logoutAction } from "@/app/auth-actions";
import { toast } from "sonner";

interface LogoutButtonProps {
    className?: string;
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
    label?: string;
    showIcon?: boolean;
}

export function LogoutButton({ className, variant = 'outline', label = 'Regresar al Login', showIcon = true }: LogoutButtonProps) {
    const router = useRouter();

    const handleLogout = async () => {
        try {
            console.log("Ejecutando Server Action de logout...");

            // 1. Ejecutar acción del servidor para borrar cookies HttpOnly
            await logoutAction();

            // 2. Limpiar todo lo demás en el cliente por si acaso
            localStorage.clear();
            sessionStorage.clear();

            // 3. Redirección total
            window.location.href = '/login';
        } catch (error) {
            console.error("Error en logout:", error);
            // Fallback agresivo si la acción falla
            document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
            window.location.href = '/login';
        }
    };

    return (
        <Button
            onClick={handleLogout}
            variant={variant}
            className={className}
        >
            {showIcon && <LogOut className="mr-2 h-4 w-4" />}
            {label}
        </Button>
    );
}
