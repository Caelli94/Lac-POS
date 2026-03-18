import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
    // 1. Obtener el token de la cookie
    const token = request.cookies.get('token')?.value

    // 2. Definir rutas protegidas
    // Protegemos todo lo que esté bajo /admin y /[slug] excepto rutas públicas si las hubiera
    const isProtectedRoute = request.nextUrl.pathname.startsWith('/admin') ||
        (request.nextUrl.pathname.split('/').length > 1 && !request.nextUrl.pathname.startsWith('/auth') && !request.nextUrl.pathname.startsWith('/setup-password') && !request.nextUrl.pathname.startsWith('/_next') && !request.nextUrl.pathname.startsWith('/api') && request.nextUrl.pathname !== '/' && request.nextUrl.pathname !== '/favicon.ico')

    // Excepción: Login y Register
    if (request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/register')) {
        // Si ya tiene token y NO viene por expiración forzada, redirigir
        if (token && !request.nextUrl.searchParams.has('expired')) {
            return NextResponse.redirect(new URL('/', request.url))
        }
        return NextResponse.next()
    }

    // 3. Verificación
    if (isProtectedRoute && !token) {
        // Si intenta entrar a ruta protegida sin token, al login
        return NextResponse.redirect(new URL('/login', request.url))
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
}
