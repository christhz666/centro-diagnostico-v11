const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend', 'src', 'components', 'AdminMedicos.js');

if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Find the loose statements and replace with function wrap
    const pattern = /const docsRes = await api\.request\('\/admin\/medicos'\);[\s\S]*?if \(statsRes && statsRes\.success\) setStats\(statsRes\.data \|\| \[\]\);/;
    
    if (pattern.test(content)) {
        content = content.replace(pattern, `    const fetchData = async () => {
        try {
            setLoading(true);
            const docsRes = await api.request('/admin/medicos');
            const statsRes = await api.request('/admin/estadisticas-medicos', { noUnwrap: true });
            if (docsRes) setMedicos(docsRes || []);
            if (statsRes && statsRes.success) setStats(statsRes.data || []);`);
        
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Successfully repaired AdminMedicos.js');
    } else {
        console.log('Pattern not found in AdminMedicos.js');
    }
} else {
    console.log('File not found');
}
