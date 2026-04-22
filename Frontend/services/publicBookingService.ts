import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const api = axios.create({
    baseURL: API_URL,
    withCredentials: true
});

export const publicBookingService = {
    getOrgDetails: async (slug: string) => {
        try {
            const res = await api.get(`/public-booking/org/${slug}`);
            return res.data;
        } catch (error) {
            return { success: false, message: 'Error al conectar' };
        }
    },

    getProfessionals: async (orgId: string) => {
        try {
            const res = await api.get(`/public-booking/professionals/${orgId}`);
            return res.data;
        } catch (error) {
            return { success: false, message: 'Error al conectar' };
        }
    },

    book: async (data: any) => {
        try {
            const res = await api.post('/public-booking/book', data);
            return res.data;
        } catch (error) {
            return { success: false, message: 'Error al procesar reserva' };
        }
    },

    getAvailability: async (profId: string, date: string) => {
        try {
            const res = await api.get(`/public-booking/availability/${profId}?date=${date}`);
            return res.data;
        } catch (error) {
            return { success: false, message: 'Error al obtener disponibilidad' };
        }
    }
};
