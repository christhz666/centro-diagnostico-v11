// ============================================
// Tests de Modelos (Mongoose Schemas)
// ============================================

const mongoose = require('mongoose');

// Importar modelos
let User, Paciente, Cita, Estudio, Factura;

beforeAll(async () => {
    // Conectar a BD de test
    const MONGO_TEST_URI = process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/centro_diagnostico_test';
    if (mongoose.connection.readyState === 0) {
        await mongoose.connect(MONGO_TEST_URI);
    }

    // Cargar modelos después de conectar
    User = require('../models/User');
    Paciente = require('../models/Paciente');
    Cita = require('../models/Cita');
    Estudio = require('../models/Estudio');
    Factura = require('../models/Factura');
});

afterAll(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany({});
    }
    await mongoose.connection.close();
});

afterEach(async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany({});
    }
});

describe('Modelo User', () => {
    it('debería crear un usuario válido', async () => {
        const userData = {
            nombre: 'Dr. Test',
            email: 'test@centromed.com',
            password: 'Password123!',
            rol: 'admin',
        };

        const user = new User(userData);
        const saved = await user.save();

        expect(saved._id).toBeDefined();
        expect(saved.nombre).toBe(userData.nombre);
        expect(saved.email).toBe(userData.email);
    });

    it('debería fallar sin email', async () => {
        const user = new User({
            nombre: 'Sin Email',
            password: 'Password123!',
        });

        let error;
        try {
            await user.save();
        } catch (e) {
            error = e;
        }

        expect(error).toBeDefined();
        expect(error.errors).toHaveProperty('email');
    });

    it('debería rechazar email duplicado', async () => {
        const userData = {
            nombre: 'Usuario 1',
            email: 'duplicado@test.com',
            password: 'Password123!',
        };

        await new User(userData).save();

        let error;
        try {
            await new User({ ...userData, nombre: 'Usuario 2' }).save();
        } catch (e) {
            error = e;
        }

        expect(error).toBeDefined();
    });
});

describe('Modelo Paciente', () => {
    it('debería crear un paciente válido', async () => {
        const paciente = new Paciente({
            nombre: 'Juan',
            apellido: 'Pérez',
            cedula: '001-1234567-8',
            telefono: '809-555-1234',
            fechaNacimiento: new Date('1990-05-15'),
            sexo: 'M',
        });

        const saved = await paciente.save();

        expect(saved._id).toBeDefined();
        expect(saved.nombre).toBe('Juan');
        expect(saved.cedula).toBe('001-1234567-8');
    });

    it('debería fallar sin nombre', async () => {
        const paciente = new Paciente({
            apellido: 'Sin Nombre',
            cedula: '001-9999999-9',
        });

        let error;
        try {
            await paciente.save();
        } catch (e) {
            error = e;
        }

        expect(error).toBeDefined();
    });
});
