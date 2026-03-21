const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend', 'src', 'components', 'ConsultaRapida.js');

if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    const pattern = /let\s+raw\s+=\s+\(codigoIn\s*\|\|\s*codigo\)\.trim\(\);[\s\S]*?\/\/ Si el scanner leyó la URL completa del QR impreso[\s\S]*?const\s+codigoLimpio\s+=\s+raw\.toUpperCase\(\);/;
    
    const replacement = `const raw = (codigoIn || codigo).trim();
    const codigoLimpio = raw.toUpperCase();`;

    if (pattern.test(content)) {
        content = content.replace(pattern, replacement);
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Successfully rolled back URL extractor in ConsultaRapida.js');
    } else {
        console.log('Target string for Rollback not found in ConsultaRapida.js');
    }
} else {
    console.log('File not found');
}
