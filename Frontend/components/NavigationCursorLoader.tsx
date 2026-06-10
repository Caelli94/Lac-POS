'use client';

import { useEffect, startTransition } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export function NavigationCursorLoader() {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // When route transition finishes, remove the loading cursor class
    useEffect(() => {
        document.body.classList.remove('global-loading-cursor');
    }, [pathname, searchParams]);

    useEffect(() => {
        const handleLinkClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const anchor = target.closest('a');
            
            if (anchor) {
                const href = anchor.getAttribute('href');
                const targetAttr = anchor.getAttribute('target');
                
                // Only trigger for standard left-click internal page navigations
                if (
                    href && 
                    href.startsWith('/') && 
                    !href.startsWith('//') && 
                    targetAttr !== '_blank' &&
                    e.button === 0 && // Left click
                    !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey // No keyboard modifiers
                ) {
                    // Start transition loading cursor
                    document.body.classList.add('global-loading-cursor');
                }
            }
        };

        // Also handle forms if needed, but anchor clicks are the main ones.
        document.addEventListener('click', handleLinkClick);
        return () => {
            document.removeEventListener('click', handleLinkClick);
        };
    }, []);

    return null;
}
