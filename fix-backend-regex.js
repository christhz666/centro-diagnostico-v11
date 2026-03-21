const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'controllers', 'resultadoController.js');

if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    const pattern = /const\s+param\s+=\s+req\.params\.facturaNumero;[\s\S]*?const\s+isObjectId\s+=\s+\/\^\[0-9a-fA-F\]\{24\}\$\/\.test\(param\);[\s\S]*?const\s+factura\s+=\s+await\s+Factura\.findOne\(\{[\s\S]*?\$or:\s*\[[\s\S]*?\}\s*\]\s*\}\)\.populate\('paciente',\s*'nombre\s+apellido\s+cedula'\);/;

    const replacement = `const param = req.params.facturaNumero;
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
        }).populate('paciente', 'nombre apellido cedula');`;

    if (pattern.test(content)) {
        content = content.replace(pattern, replacement);
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Successfully updated backend lookup in resultadoController.js');
    } else {
        console.log('Target string for backend lookup not found in resultadoController.js');
    }
} else {
    console.log('File not found');
}
