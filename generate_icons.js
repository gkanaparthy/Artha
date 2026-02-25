const fs = require('fs');

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="left-leaf" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#34d399" />
      <stop offset="100%" stop-color="#059669" />
    </linearGradient>
    <linearGradient id="right-leaf" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#10b981" />
      <stop offset="100%" stop-color="#047857" />
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#a7f3d0" />
      <stop offset="100%" stop-color="#34d399" />
    </linearGradient>
  </defs>
  
  <!-- Sleek, geometric fintech leaf using precise curves -->
  <g transform="translate(256, 256) scale(1.1) translate(-256, -256)">
      <!-- Right Half of Leaf (Droplet curve) -->
      <path d="M256,64 C360,160 416,256 416,336 C416,424 344,464 256,464 C256,464 256,364 256,64 Z" 
            fill="url(#right-leaf)" />
            
      <!-- Left Half of Leaf (Overlapping, sharp inner edge) -->
      <path d="M256,64 C152,160 96,256 96,336 C96,424 168,464 256,464 L256,64 Z" 
            fill="url(#left-leaf)" />
            
      <!-- Center elegant split / shine line -->
      <path d="M256,64 L256,464" stroke="url(#accent)" stroke-width="8" stroke-linecap="round" opacity="0.8" />
      
      <!-- Fold accents (tech aesthetic) -->
      <path d="M256,220 L160,316" stroke="url(#accent)" stroke-width="6" stroke-linecap="round" opacity="0.5" />
      <path d="M256,280 L180,356" stroke="url(#accent)" stroke-width="6" stroke-linecap="round" opacity="0.3" />
      
      <path d="M256,180 L350,274" stroke="url(#accent)" stroke-width="6" stroke-linecap="round" opacity="0.5" />
      <path d="M256,240 L330,314" stroke="url(#accent)" stroke-width="6" stroke-linecap="round" opacity="0.3" />
  </g>
</svg>`;

fs.writeFileSync('src/app/icon.svg', svgContent);

const sharp = require('sharp');
const generate = async () => {
    try {
        const svgBuffer = Buffer.from(svgContent);

        // Remove old bulky icon if present
        if (fs.existsSync('src/app/icon.png')) fs.unlinkSync('src/app/icon.png');
        if (fs.existsSync('src/app/icon1.png')) fs.unlinkSync('src/app/icon1.png');
        if (fs.existsSync('src/app/icon2.png')) fs.unlinkSync('src/app/icon2.png');
        if (fs.existsSync('src/app/favicon.ico')) fs.unlinkSync('src/app/favicon.ico');

        // New Next.js App Router metadata conventions
        // icon1.png -> 16x16
        await sharp(svgBuffer).resize(16, 16).png().toFile('src/app/icon1.png');
        // icon2.png -> 32x32 
        await sharp(svgBuffer).resize(32, 32).png().toFile('src/app/icon2.png');

        // Apple Touch Icon 180x180 - with a dark background for contrast
        await sharp(svgBuffer)
            .resize(130, 130, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .extend({
                top: 25, bottom: 25, left: 25, right: 25,
                background: '#0A110D'
            })
            .png()
            .toFile('src/app/apple-icon.png');

        console.log('Generated gorgeous geometric SVG favicons!');
    } catch (e) {
        console.error(e);
    }
}

generate();
