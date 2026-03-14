import { organizationService } from '@/services/organizationService'
import { notFound } from 'next/navigation'
import { PersonalizationForm } from './personalization-form'
import { getServerUser } from '@/lib/server-auth';

interface Props {
    params: Promise<{ slug: string }>
}

export default async function PersonalizationPage({ params }: Props) {
    const { slug } = await params
    const [org, user] = await Promise.all([
        organizationService.getBySlug(slug),
        getServerUser()
    ]);

    if (!org) return notFound()

    return (
        <div className="p-6 max-w-none mx-auto space-y-6 animate-in fade-in duration-500">
            <header className="flex flex-col gap-1">
                <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                    Personalización
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                    Configura la identidad visual y la experiencia de usuario de tu panel.
                </p>
            </header>

            <PersonalizationForm org={org} user={user} />
        </div>
    )
}
