const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const facturaSchema = new mongoose.Schema({
    numero: {
        type: String
    },
    sucursal: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Sucursal',
        required: false // Temporalmente false para no romper datos viejos en script
    },
    tipo: {
        type: String,
        enum: ['fiscal', 'consumidor_final', 'credito_fiscal', 'nota_credito'],
        default: 'consumidor_final'
    },
    paciente: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Paciente',
        required: true
    },
    cita: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Cita'
    },
    datosCliente: {
        nombre: String,
        cedula: String,
        rnc: String,
        direccion: String,
        telefono: String,
        email: String
    },
    items: [{
        descripcion: String,
        estudio: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Estudio'
        },
        cantidad: { type: Number, default: 1 },
        precioUnitario: Number,
        descuento: { type: Number, default: 0 },
        subtotal: Number
    }],
    subtotal: { type: Number, required: true, default: 0 },
    descuento: { type: Number, default: 0 },
    itbis: { type: Number, default: 0 },
    total: { type: Number, required: true, default: 0 },
    metodoPago: {
        type: String,
        enum: ['efectivo', 'tarjeta', 'transferencia', 'cheque', 'seguro', 'mixto'],
        default: 'efectivo'
    },
    pagado: { type: Boolean, default: false },
    montoPagado: { type: Number, default: 0 },
    estado: {
        type: String,
        enum: ['borrador', 'emitida', 'pagada', 'anulada'],
        default: 'emitida'
    },
    creadoPor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    anuladoPor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    motivoAnulacion: String,
    fechaAnulacion: Date,
    notas: String,

    registroIdNumerico: {
        type: String,
        index: true
    },
    // ID Corto de 4-5 dígitos para máquinas de laboratorio (LIS)
    codigoLIS: {
        type: Number,
        unique: true,
        sparse: true,
        index: true
    },
    codigoBarras: {
        type: String,
        index: true
    },
    // QR único por factura para acceso a resultados
    codigoQR: {
        type: String,
        unique: true,
        sparse: true
    },
    // Credenciales de acceso del paciente generadas automáticamente
    pacienteUsername: {
        type: String
    },
    pacientePassword: {
        type: String
    }
}, {
    timestamps: true
});

// Auto-generar número de factura ANTES de validar
facturaSchema.pre('validate', async function (next) {
    try {
        if (!this.numero) {
            let filter = {};
            if (this.sucursal) filter.sucursal = this.sucursal;
            const count = await mongoose.model('Factura').countDocuments(filter);
            const sequence = (count + 1).toString().padStart(6, '0');

            // ID corto y universal para LIS
            this.numero = `FAC-${sequence}`;
        }

        if (!this.codigoBarras) {
            // Generar código de barras único basado en timestamp corto y random
            const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
            this.codigoBarras = `${Date.now().toString().slice(-6)}${randomStr}`;
        }

        // Generar Codigo LIS usando el mismo número de factura
        if (!this.codigoLIS && this.numero) {
            // Extraer parte numérica del número de factura para usar como LIS ID
            const match = this.numero.match(/(\d+)/);
            if (match) {
                this.codigoLIS = parseInt(match[1], 10);
            }
        }
        if (!this.codigoLIS) {
            // Fallback: usar secuencia incremental
            const ultimaFacturaLIS = await mongoose.model('Factura').findOne({ codigoLIS: { $exists: true } }).sort({ codigoLIS: -1 });
            if (ultimaFacturaLIS && ultimaFacturaLIS.codigoLIS) {
                this.codigoLIS = ultimaFacturaLIS.codigoLIS + 1;
                if (this.codigoLIS > 99999) {
                    this.codigoLIS = 1000;
                }
            } else {
                this.codigoLIS = 1000;
            }
        }

        // Guardar ID numérico para referencia
        if (!this.registroIdNumerico && this.numero) {
            const match = this.numero.match(/(\d+)/);
            if (match) this.registroIdNumerico = match[1];
        }

        // Generar código QR único por factura
        if (!this.codigoQR) {
            const crypto = require('crypto');
            this.codigoQR = crypto.randomBytes(8).toString('hex').toUpperCase();
        }

        // Generar credenciales del paciente para ver resultados
        if (!this.pacienteUsername && this.paciente) {
            const Paciente = mongoose.model('Paciente');
            const pac = await Paciente.findById(this.paciente);
            if (pac) {
                // Username: nombre del paciente + secuencia de factura para unicidad
                const nombre = (pac.nombre || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
                const seq = this.numero ? this.numero.replace(/[^0-9]/g, '').slice(-4) : String(Date.now()).slice(-4);
                this.pacienteUsername = (nombre || 'paciente') + seq;

                // Password: apellido del paciente (sin espacios, minúsculas)
                const apellido = (pac.apellido || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
                const rawPassword = apellido || String(Date.now()).slice(-6);

                // Guardar texto plano para impresión ANTES de hashear
                this._plainPassword = rawPassword;

                // Hashear la contraseña para la base de datos
                const salt = await bcrypt.genSalt(10);
                this.pacientePassword = await bcrypt.hash(rawPassword, salt);
            }
        }
    } catch (e) {
        console.error('Error en pre-validate de Factura:', e.message);
    }
    next();
});

// Método para comparar la contraseña del paciente
facturaSchema.methods.comparePassword = async function (candidatePassword) {
    if (!this.pacientePassword) return false;
    return bcrypt.compare(candidatePassword, this.pacientePassword);
};

facturaSchema.index({ numero: 1, sucursal: 1 }, { unique: true });
facturaSchema.index({ paciente: 1 });
facturaSchema.index({ createdAt: -1 });
facturaSchema.index({ registroIdNumerico: 1 });
facturaSchema.index({ codigoBarras: 1 });

module.exports = mongoose.model('Factura', facturaSchema);
