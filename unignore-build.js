const fs = require('fs');
const path = require('path');

const rootGitignore = path.join(__dirname, '.gitignore');
const frontGitignore = path.join(__dirname, 'frontend', '.gitignore');

if (fs.existsSync(rootGitignore)) {
    let content = fs.readFileSync(rootGitignore, 'utf8');
    content = content.split('\n').filter(line => !line.includes('frontend/build/')).join('\n');
    fs.writeFileSync(rootGitignore, content, 'utf8');
    console.log('Updated root .gitignore');
}

if (fs.existsSync(frontGitignore)) {
    let content = fs.readFileSync(frontGitignore, 'utf8');
    content = content.split('\n').filter(line => !line.trim().startsWith('/build') && !line.trim().startsWith('build/')).join('\n');
    fs.writeFileSync(frontGitignore, content, 'utf8');
    console.log('Updated frontend .gitignore');
}
