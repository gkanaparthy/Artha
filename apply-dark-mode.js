const fs = require('fs');
const path = require('path');

const files = [
    'src/app/page.tsx',
    'src/components/landing/how-it-works.tsx',
    'src/components/landing/comparison-table.tsx',
    'src/components/landing/psychology-preview.tsx',
    'src/components/landing/broker-logos.tsx',
    'src/components/landing/faq-section.tsx',
    'src/components/subscription/pricing-section.tsx',
    'src/components/landing/blog-preview.tsx',
    'src/components/landing/final-cta.tsx', // just in case
];

function convertToDarkMode(content) {
    // Backgrounds
    content = content.replace(/bg-\[\#FAFBF6\]/g, 'bg-[#0A110D]');
    
    // The problem section / general white backgrounds
    // Only replace bg-white if it's not part of bg-white/10 etc.
    content = content.replace(/bg-white(?!\/)/g, 'bg-[#11211A]');
    // Also change "border-white/10 bg-[#0f1f18]" ? No, that's already dark.
    
    // Texts
    content = content.replace(/text-\[\#2E4A3B\]\/75/g, 'text-white/75');
    content = content.replace(/text-\[\#2E4A3B\]\/70/g, 'text-white/70');
    content = content.replace(/text-\[\#2E4A3B\]\/60/g, 'text-white/60');
    content = content.replace(/text-\[\#2E4A3B\]\/50/g, 'text-white/50');
    content = content.replace(/text-\[\#2E4A3B\]\/40/g, 'text-white/40');
    content = content.replace(/text-\[\#2E4A3B\](?!\/)/g, 'text-white');
    
    // Borders
    content = content.replace(/border-\[\#2E4A3B\]\/10/g, 'border-white/10');
    content = content.replace(/border-\[\#2E4A3B\]\/5/g, 'border-white/5');

    // Cards / Accents
    content = content.replace(/bg-\[\#E8EFE0\]\/50/g, 'bg-white/5');
    content = content.replace(/bg-\[\#E8EFE0\]\/45/g, 'bg-[#4ADE80]/10 border border-[#4ADE80]/20');
    content = content.replace(/bg-\[\#E8EFE0\]\/30/g, 'bg-white/5');
    content = content.replace(/bg-\[\#E8EFE0\]\/20/g, 'bg-white/5');
    content = content.replace(/bg-\[\#E8EFE0\](?!\/)/g, 'bg-white/5');
    
    // Mobile Nav Button
    content = content.replace(/text-white hover:bg-\[\#2E4A3B\]\/10/g, 'text-white hover:bg-white/10');

    // Specific fixes
    // The final CTA background was #1A2F25. Let's keep it or change it to #0A110D to match.
    content = content.replace(/bg-\[\#1A2F25\]/g, 'bg-[#0A110D]');

    // Fix Image logos (Artha Logo) to be inverted everywhere
    content = content.replace(/Image src="\/logo\.png" alt="Artha Logo" fill className="object-contain" \/>/g, 'Image src="/logo.png" alt="Artha Logo" fill className="object-contain brightness-0 invert" />');

    // Make sure we didn't break Button text colors (e.g. text-[#1A2F25] inside green buttons is fine, it shouldn't have been replaced because it was 1A2F25, not 2E4A3B)
    
    return content;
}

for (const file of files) {
    const fullPath = path.join(__dirname, file);
    if (fs.existsSync(fullPath)) {
        let text = fs.readFileSync(fullPath, 'utf8');
        let newText = convertToDarkMode(text);
        fs.writeFileSync(fullPath, newText, 'utf8');
        console.log(`Updated ${file}`);
    } else {
        console.log(`File not found: ${file}`);
    }
}
