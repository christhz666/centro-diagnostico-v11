// ============================================
// Setup global para tests
// ============================================

const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

// URI de test separada de producción
const MONGO_TEST_URI = process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/centro_diagnostico_test';

beforeAll(async () => {
    await mongoose.connect(MONGO_TEST_URI);
});

afterAll(async () => {
    // Limpiar base de datos de test
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany({});
    }
    await mongoose.connection.close();
});

afterEach(async () => {
    // Limpiar datos después de cada test
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany({});
    }
});
