const { Jimp } = require('jimp');

async function invertLogo() {
    try {
        console.log('Reading logo.png...');
        // Jimp 1.x API requires Jimp.read
        const image = await Jimp.read('public/logo.png');

        console.log('Inverting colors...');
        // Invert the colors (this keeps the alpha channel intact in Jimp)
        image.invert();

        console.log('Saving inverted versions...');
        await image.write('public/logo-dark.png');
        await image.write('src/app/icon.png');
        await image.write('src/app/apple-icon.png');

        // Let's also create an og-image-dark.png or just invert og-image?
        // The user specifically mentioned the "browser preview" which is icon/apple-icon and optionally og-image.
        const ogImage = await Jimp.read('public/og-image.png');
        ogImage.invert();
        await ogImage.write('public/og-image.png');

        console.log('Successfully inverted logos and og-image for dark mode!');
    } catch (err) {
        console.error('Error inverting images', err);
    }
}

invertLogo();
