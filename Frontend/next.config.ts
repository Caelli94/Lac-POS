import type { NextConfig } from "next";

/**
 * ACLARACIÓN: Configuración de Next.js.
 * Se agrega 'remotePatterns' para autorizar el dominio de Supabase.
 * Esto permite que el componente <Image /> cargue y optimice tus fotos de producto.
 */
const nextConfig: NextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'hktxfhbeiyrddxpmipir.supabase.co',
                port: '',
                pathname: '/storage/v1/object/public/**',
            },
        ],
    },
    async rewrites() {
        return [
            {
                source: '/api/:path*',
                destination: 'http://127.0.0.1:3001/api/:path*',
            },
        ];
    },
};

export default nextConfig;