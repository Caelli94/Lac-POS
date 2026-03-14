'use client'

import { useState } from 'react'
import { TenantSidebar } from './sidebar'
import { cn } from '@/lib/utils'
import { ThemeCustomizer } from '@/components/theme-customizer'

interface SidebarLayoutProps {
    children: React.ReactNode
    slug: string
    userName?: string
    userRole?: string
    rolePermissions?: any[]
    features: string[]
    orgName: string
    orgId?: string
    settings?: any
}

export function SidebarLayout({ children, slug, userName, userRole, rolePermissions, features, orgName, orgId, settings }: SidebarLayoutProps) {
    const [isCollapsed, setIsCollapsed] = useState(false)

    // Helper to remove empty strings so defaults can take over (duplicated from personalization-form)
    // TODO: Move to shared utility if reused more
    const cleanObject = (obj: any): any => {
        if (!obj || typeof obj !== 'object') return obj;
        if (Array.isArray(obj)) return obj.map(cleanObject);

        return Object.entries(obj).reduce((acc, [key, value]) => {
            if (value === '' || value === null || value === undefined) {
                return acc;
            }
            if (typeof value === 'object') {
                const cleaned = cleanObject(value);
                if (Object.keys(cleaned).length > 0) {
                    acc[key] = cleaned;
                }
                return acc;
            }
            acc[key] = value;
            return acc;
        }, {} as any);
    };

    const themeConfig = settings?.theme ? cleanObject(settings.theme) : undefined;

    return (
        <div className="flex min-h-screen bg-background text-foreground transition-colors duration-300">
            <ThemeCustomizer config={themeConfig} />
            <TenantSidebar
                slug={slug}
                userName={userName}
                userRole={userRole}
                rolePermissions={rolePermissions}
                features={features}
                orgName={orgName}
                isCollapsed={isCollapsed}
                onToggle={() => setIsCollapsed(!isCollapsed)}
            />
            <main className={cn(
                "flex-1 p-8 transition-all duration-300",
                isCollapsed ? "ml-20" : "ml-64"
            )}>
                {children}
            </main>
        </div>
    )
}
