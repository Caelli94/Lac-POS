# Guia de Configuracion: Asistente IA LAC-POS

Para que el asistente funcione correctamente y puedas ofrecerlo a tus clientes, segui estos pasos:

## 1. Obtener tu GEMINI_API_KEY
1. Entra a [Google AI Studio](https://aistudio.google.com/).
2. Logueate con tu cuenta de Google.
3. Hace clic en **"Get API key"** en el panel izquierdo.
4. Hace clic en **"Create API key in new project"**.
5. Copia la clave generada.

## 2. Configurar el Servidor
1. Abre el archivo `Backend/.env`.
2. Agrega la linea: `GEMINI_API_KEY=PEGAR_ACA_TU_CLAVE`.
3. Reinicia el servidor del Backend.

## 3. ¿Como limitar a los clientes?
Hemos implementado dos niveles de proteccion para que no se te disparen los costos:

### A. Control por IP (Rate Limiter)
El sistema permite un maximo de **50 mensajes por hora por cada usuario**. Si alguien intenta "bombardear" a la IA, el sistema lo bloqueara automaticamente por una hora.
*Configurado en:* `Backend/src/middlewares/securityMiddleware.ts`

### B. Habilitacion por Empresa
Como dueño (Super Admin), vos activas la IA solo a las empresas que te paguen el modulo. 
*Donde:* Panel Admin > Empresas > [Nombre] > Modulos > Activar "Asistente IA".

## 4. Entrenamiento Continuo
La IA "aprende" leyendo el archivo `docs/help_context.md`. Todo lo que escribas ahi (nuevos procesos, reglas de negocio, etc.) sera aprendido por el asistente de forma inmediata sin necesidad de reiniciar el sistema.
