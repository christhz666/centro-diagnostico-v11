// ============================================
// Tests de Autenticación
// ============================================

const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../server');

describe('Auth API', () => {

    describe('POST /api/auth/login', () => {
        it('debería rechazar login sin credenciales', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({});

            expect(res.statusCode).toBeGreaterThanOrEqual(400);
        });

        it('debería rechazar login con credenciales incorrectas', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'noexiste@test.com',
                    password: 'wrongpassword'
                });

            expect(res.statusCode).toBeGreaterThanOrEqual(400);
            expect(res.body.success).toBe(false);
        });

        it('debería rechazar login sin password', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'test@test.com'
                });

            expect(res.statusCode).toBeGreaterThanOrEqual(400);
        });
    });

    describe('GET /api/health', () => {
        it('debería responder con estado de salud', async () => {
            const res = await request(app)
                .get('/api/health');

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body).toHaveProperty('timestamp');
            expect(res.body).toHaveProperty('database');
        });
    });

    describe('GET /', () => {
        it('debería responder con info de la API', async () => {
            const res = await request(app)
                .get('/');

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toContain('Centro Diagnóstico');
        });
    });

    describe('Rutas protegidas', () => {
        it('debería rechazar acceso sin token a /api/pacientes', async () => {
            const res = await request(app)
                .get('/api/pacientes');

            expect(res.statusCode).toBeGreaterThanOrEqual(401);
        });

        it('debería rechazar acceso con token inválido', async () => {
            const res = await request(app)
                .get('/api/pacientes')
                .set('Authorization', 'Bearer token_invalido_12345');

            expect(res.statusCode).toBeGreaterThanOrEqual(401);
        });
    });
});
