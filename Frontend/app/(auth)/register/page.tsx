'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { register } from './actions'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import Link from 'next/link'

export default function RegisterPage() {
    const [loading, setLoading] = useState(false)

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setLoading(true)

        const formData = new FormData(event.currentTarget)
        const result = await register(formData)

        if (result?.error) {
            toast.error(result.error)
            setLoading(false)
        } else {
            toast.success("¡Cuenta creada con éxito!")
            // Redirección manejada por el server action
        }
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <Card className="w-full max-w-sm shadow-lg">
                <CardHeader className="text-center space-y-1">
                    <CardTitle className="text-2xl font-bold">Crear Cuenta</CardTitle>
                    <CardDescription>
                        Regístrate para comenzar a usar el sistema
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Nombre Completo</Label>
                            <Input id="name" name="name" placeholder="Tu Nombre" required />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="email">Correo Electrónico</Label>
                            <Input id="email" name="email" type="email" placeholder="nombre@empresa.com" required />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="password">Contraseña</Label>
                            <Input id="password" name="password" type="password" required />
                        </div>
                        <Button type="submit" className="w-full mt-2" disabled={loading}>
                            {loading ? "Registrando..." : "Registrarse"}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex justify-center">
                    <p className="text-sm text-gray-500">
                        ¿Ya tienes cuenta?{' '}
                        <Link href="/login" className="text-blue-600 hover:underline">
                            Inicia Sesión
                        </Link>
                    </p>
                </CardFooter>
            </Card>
        </div>
    )
}
