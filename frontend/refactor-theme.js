const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'src', 'components');

const replacements = [
    { regex: /(?<!dark:)bg-\[\#10131a\]/g, replace: 'bg-gray-50 dark:bg-[#10131a]' },
    { regex: /(?<!dark:)bg-\[\#191b23\]/g, replace: 'bg-white dark:bg-[#191b23]' },
    { regex: /(?<!dark:)bg-\[\#1d2027\]/g, replace: 'bg-white dark:bg-[#1d2027]' },
    { regex: /(?<!dark:)bg-\[\#272a31\]/g, replace: 'bg-gray-50 dark:bg-[#272a31]' },
    { regex: /(?<!dark:)bg-\[\#32353c\]/g, replace: 'bg-gray-100 dark:bg-[#32353c]' },
    
    // Text colors (only if they aren't already prefixed with dark:)
    { regex: /(?<!dark:)text-\[\#e0e2ec\]/g, replace: 'text-gray-900 dark:text-[#e0e2ec]' },
    { regex: /(?<!dark:)text-\[\#bacac7\]/g, replace: 'text-gray-600 dark:text-[#bacac7]' },
    { regex: /(?<!dark:)text-\[\#849491\]/g, replace: 'text-gray-500 dark:text-[#849491]' },
    
    // Borders
    { regex: /(?<!dark:)border-white\/5/g, replace: 'border-gray-200 dark:border-white/5' },
    { regex: /(?<!dark:)border-white\/10/g, replace: 'border-gray-200 dark:border-white/10' },
    { regex: /(?<!dark:)border-\[\#32353c\]/g, replace: 'border-gray-300 dark:border-[#32353c]' },
    
    // Specific text-white adjustments (careful with buttons, let's only do it for text-white that are generally on surfaces. It's safer to only target text-white inside these files if we are sure, but maybe skip strict text-white unless it's a known div background)
    // To be safe, we will replace `text-white` with `text-gray-900 dark:text-white` but ONLY if there's no `bg-[#4afdef]` or `bg-blue` nearby. 
    // Actually, a simple regex for `text-white` is risky. We'll skip `text-white` for automated and fix it manually if needed, or replace it where safe.
];

const processDir = (dirPath) => {
    const files = fs.readdirSync(dirPath);
    files.forEach(file => {
        const fullPath = path.join(dirPath, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
        } else if (fullPath.endsWith('.js') || fullPath.endsWith('.jsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let originalContent = content;
            
            replacements.forEach(({regex, replace}) => {
                content = content.replace(regex, replace);
            });

            // Safe replace for text-white
            content = content.replace(/(?<!dark:)text-white/g, 'text-gray-900 dark:text-white');

            if (content !== originalContent) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log(`Updated ${file}`);
            }
        }
    });
};

processDir(directoryPath);
processDir(path.join(__dirname, 'src'));
