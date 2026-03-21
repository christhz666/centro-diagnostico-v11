const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'controllers', 'resultadoController.js');

if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    const targetIndex = lines.findIndex(l => l.includes('exports.getResultadosPorFactura = async'));
    
    if (targetIndex !== -1) {
        const start = targetIndex + 2; 
        const end = targetIndex + 13; 
        
        lines.splice(start, end - start + 1, 
`        const param = req.params.facturaNumero;
        const cleanParam = param ? param.trim() : '';
        const paramSinPrefix = cleanParam.replace(/^FAC-/i, '');
        const isObjectId = /^[0-9a-fA-F]{24}$/.test(cleanParam);
        
        const factura = await Factura.findOne({
            $or: [
                { numero: new RegExp('^' + cleanParam + '$', 'i') },
                { numero: new RegExp('^' + paramSinPrefix + '$', 'i') },
                { codigoBarras: new RegExp('^' + cleanParam + '$', 'i') },
                { codigoBarras: new RegExp('^' + paramSinPrefix + '$', 'i') },
                { codigoQR: new RegExp('^' + cleanParam + '$', 'i') },
                { codigoLIS: parseInt(cleanParam, 10) || parseInt(paramSinPrefix, 10) || -1 },
                { registroIdNumerico: cleanParam },
                { registroIdNumerico: paramSinPrefix },
                ...(isObjectId ? [{ _id: cleanParam }] : [])
            ]
        }).populate('paciente', 'nombre apellido cedula');`
        );
        
        fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
        console.log('Successfully updated backend lookup with line indices');
    } else {
        console.log('Function header not found');
    }
} else {
    console.log('File not found');
}
