const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const User = require('./models/User');

const ADMIN_USER = {
  nombre: 'Administrador',
  apellido: 'Sistema',
  username: 'admin',
  email: 'admin@miesperanza.com',
  password: 'Admin123!',
  role: 'admin',
  telefono: '809-000-0000',
  activo: true
};

async function createOrResetAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/centro_diagnostico');

    let admin = await User.findOne({
      $or: [
        { email: ADMIN_USER.email },
        { username: ADMIN_USER.username }
      ]
    }).select('+password');

    if (!admin) {
      admin = await User.create(ADMIN_USER);
      console.log('Admin creado correctamente.');
    } else {
      admin.nombre = ADMIN_USER.nombre;
      admin.apellido = ADMIN_USER.apellido;
      admin.username = ADMIN_USER.username;
      admin.email = ADMIN_USER.email;
      admin.password = ADMIN_USER.password;
      admin.role = ADMIN_USER.role;
      admin.telefono = ADMIN_USER.telefono;
      admin.activo = true;
      await admin.save();
      console.log('Admin existente actualizado y reactivado.');
    }

    console.log('Credenciales de acceso:');
    console.log(`Usuario: ${ADMIN_USER.username}`);
    console.log(`Email: ${ADMIN_USER.email}`);
    console.log(`Contrasena: ${ADMIN_USER.password}`);
  } catch (error) {
    console.error('No se pudo crear/restablecer el admin:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
}

createOrResetAdmin();
