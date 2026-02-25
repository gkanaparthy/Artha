const fs = require('fs');
const { execSync } = require('child_process');

console.log('Installing sharp...');
try {
    // Use npm install sharp if not present
    execSync('npm install sharp', { stdio: 'inherit' });
} catch (e) {
    console.error('Failed to install sharp', e);
}

const sharp = require('sharp');
const path = require('path');

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
  <path d="M360 40 C360 40 360 220 200 360 C80 360 40 280 40 200 C40 40 220 40 360 40 Z" fill="#4ADE80" />
  <path d="M120 280 C180 220 260 140 320 80" stroke="#0A110D" stroke-width="24" stroke-linecap="round" stroke-linejoin="round" />
</svg>`;

fs.writeFileSync('src/app/icon.svg', svgContent);
fs.writeFileSync('public/logo-leaf.svg', svgContent);

const generate = async () => {
    try {
        const svgBuffer = Buffer.from(svgContent);

        // Remove old bulky icon
        if (fs.existsSync('src/app/icon.png')) {
            fs.unlinkSync('src/app/icon.png');
        }

        // 16x16
        await sharp(svgBuffer).resize(16, 16).png().toFile('src/app/icon1.png');
        console.log('Generated 16x16 icon');

        // 32x32 
        await sharp(svgBuffer).resize(32, 32).png().toFile('src/app/icon2.png');
        console.log('Generated 32x32 icon');

        // Apple Touch Icon 180x180 - with a dark background for contrast
        await sharp(svgBuffer)
            .resize(120, 120, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .extend({
                top: 30, bottom: 30, left: 30, right: 30,
                background: '#0A110D'
            })
            .png()
            .toFile('src/app/apple-icon.png');
        console.log('Generated apple-icon.png (180x180)');

        // We can also create a nice og-image with the leaf logo
        // Let's create an og-image-dark replacing the old one maybe later, or keep the old one but simplify it.
        // Actually the user only asked for favicon

    } catch (e) {
        console.error(e);
    }
}

generate();
