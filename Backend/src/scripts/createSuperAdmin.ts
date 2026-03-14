
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { User } from '../models/User';

// Load env vars
dotenv.config({ path: path.join(__dirname, '../../.env') });

// SCRIPT LIMPIO POR SEGURIDAD
// Las credenciales han sido borradas después de la ejecución.

const createSuperAdmin = async () => {
    console.log("Este script ya fue ejecutado. Edita el archivo de nuevo si necesitas correrlo otra vez.");
};

createSuperAdmin();
