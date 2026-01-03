# Icon Conversion Guide for AEHCONNECT

## Your Source Icon
Source: `D:\ACEi App\dutycare-connect\image\aehconnect_icon.jpeg`

## Files to Replace in the `public` folder:

### Required Files and Sizes:

1. **favicon.ico** 
   - Browser tab icon
   - Size: 16x16, 32x32, 48x48 (ICO format)
   - Location: `public/favicon.ico`

2. **apple-touch-icon.png**
   - iOS home screen icon
   - Size: 180x180 pixels
   - Location: `public/apple-touch-icon.png`

3. **pwa-192x192.png**
   - Android small icon
   - Size: 192x192 pixels
   - Location: `public/pwa-192x192.png`

4. **pwa-512x512.png**
   - Android large icon
   - Size: 512x512 pixels
   - Location: `public/pwa-512x512.png`

5. **pwa-maskable-192x192.png**
   - Maskable small icon (with 20% padding)
   - Size: 192x192 pixels
   - Location: `public/pwa-maskable-192x192.png`

6. **pwa-maskable-512x512.png**
   - Maskable large icon (with 20% padding)
   - Size: 512x512 pixels
   - Location: `public/pwa-maskable-512x512.png`

7. **mask-icon.svg**
   - Safari pinned tab icon
   - Format: SVG (monochrome)
   - Location: `public/mask-icon.svg`

## Online Tools for Conversion (Easiest Method):

### Option 1: PWA Asset Generator (Recommended)
1. Go to: https://www.pwabuilder.com/imageGenerator
2. Upload your `aehconnect_icon.jpeg`
3. Download the generated zip file
4. Extract and copy all files to `D:\ACEi App\dutycare-connect\public\`

### Option 2: Favicon.io
1. Go to: https://favicon.io/favicon-converter/
2. Upload your `aehconnect_icon.jpeg`
3. Download the generated files
4. Rename and copy to the public folder

### Option 3: RealFaviconGenerator
1. Go to: https://realfavicongenerator.net/
2. Upload your `aehconnect_icon.jpeg`
3. Download the generated package
4. Copy files to the public folder

## Manual PowerShell Script (If you have ImageMagick installed):

```powershell
# Install ImageMagick first: winget install ImageMagick.ImageMagick

$source = "D:\ACEi App\dutycare-connect\image\aehconnect_icon.jpeg"
$publicDir = "D:\ACEi App\dutycare-connect\public"

# Create PNG versions
magick "$source" -resize 180x180 "$publicDir\apple-touch-icon.png"
magick "$source" -resize 192x192 "$publicDir\pwa-192x192.png"
magick "$source" -resize 512x512 "$publicDir\pwa-512x512.png"

# Create maskable versions (with padding)
magick "$source" -resize 154x154 -background transparent -gravity center -extent 192x192 "$publicDir\pwa-maskable-192x192.png"
magick "$source" -resize 410x410 -background transparent -gravity center -extent 512x512 "$publicDir\pwa-maskable-512x512.png"

# Create favicon.ico
magick "$source" -resize 48x48 -resize 32x32 -resize 16x16 "$publicDir\favicon.ico"

Write-Host "Icons generated successfully!"
Write-Host "Note: mask-icon.svg needs to be created manually or use an online tool"
```

## What are Maskable Icons?

Maskable icons are PWA icons that work with Android's adaptive icon system. They have extra padding (safe zone) so the icon isn't cropped when displayed in different shapes (circle, squircle, etc.).

**Safe Zone**: Keep your main logo content within the center 80% of the canvas. The outer 20% may be masked on some devices.

## After Replacing Icons:

1. Clear browser cache (Ctrl+Shift+Delete)
2. Restart dev server
3. Hard refresh (Ctrl+Shift+R)
4. Test on mobile devices
5. Uninstall and reinstall PWA if already installed

## Testing Your New Icons:

1. **Browser Tab**: Check favicon appears in tab
2. **PWA Install**: Install app and check home screen icon
3. **iOS**: Add to home screen from Safari
4. **Android**: Install PWA and check icon on home screen
5. **Safari Pinned Tab**: Pin tab in Safari on macOS

## File Checklist:

- [ ] favicon.ico (16x16, 32x32, 48x48)
- [ ] apple-touch-icon.png (180x180)
- [ ] pwa-192x192.png (192x192)
- [ ] pwa-512x512.png (512x512)
- [ ] pwa-maskable-192x192.png (192x192 with padding)
- [ ] pwa-maskable-512x512.png (512x512 with padding)
- [ ] mask-icon.svg (optional, for Safari)

All files should be placed in: `D:\ACEi App\dutycare-connect\public\`
