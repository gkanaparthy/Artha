const sharp = require('sharp');
const fs = require('fs');

async function processIcon() {
    const origPath = '/Users/gautham/.gemini/antigravity/brain/7fb0c104-f805-4b7c-ac17-d37ea2fd0daa/artha_premium_icon_1771996192253.png';

    // The image has text at the bottom. We will crop the top portion and scale it gracefully.
    // The image is 640x640.
    // Let's crop width 400, height 400, starting from left: 120, top: 40.

    const croppedBuffer = await sharp(origPath)
        .extract({ width: 400, height: 400, left: 120, top: 20 })
        .toBuffer();

    // Remove the basic SVGs that were rendering the "5-year-old drawing"
    if (fs.existsSync('src/app/icon.svg')) {
        fs.unlinkSync('src/app/icon.svg');
    }
    if (fs.existsSync('public/logo-leaf.svg')) {
        fs.unlinkSync('public/logo-leaf.svg');
    }

    // Save as primary hi-res logo
    await sharp(croppedBuffer).png().toFile('public/logo-leaf.png');

    // Generate accurate Next.js App Router icons
    // 16x16
    await sharp(croppedBuffer).resize(16, 16).png().toFile('src/app/icon1.png');

    // 32x32
    await sharp(croppedBuffer).resize(32, 32).png().toFile('src/app/icon2.png');

    // 180x180 for Apple touch - we can pad it a bit inside a solid black background
    await sharp(croppedBuffer)
        .resize(130, 130, { fit: 'contain', background: '#0A110D' }) // smaller leaf
        .extend({
            top: 25, bottom: 25, left: 25, right: 25,
            background: '#0A110D'
        })
        .png()
        .toFile('src/app/apple-icon.png');

    console.log('Successfully generated gorgeous premium neon green/gold leaf favicons!');
}

processIcon().catch(console.error);
