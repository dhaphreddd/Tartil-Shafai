Add-Type -AssemblyName System.Drawing

function Resize-Image {
    param(
        [string]$SourcePath,
        [string]$DestPath,
        [int]$Width,
        [int]$Height
    )
    $dir = Split-Path $DestPath
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }

    $src = [System.Drawing.Image]::FromFile($SourcePath)
    $bmp = New-Object System.Drawing.Bitmap($Width, $Height)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    
    $g.DrawImage($src, 0, 0, $Width, $Height)
    $bmp.Save($DestPath, [System.Drawing.Imaging.ImageFormat]::Png)
    
    $g.Dispose()
    $bmp.Dispose()
    $src.Dispose()
}

$source = "D:\Code\Logo Jalsah.png"

# App logos
Resize-Image $source "d:\Code\Tartil-Shafai\public\logo.png" 192 192
Resize-Image $source "d:\Code\Tartil-Shafai\public\logo-128.png" 128 128
Resize-Image $source "d:\Code\Tartil-Shafai\public\logo-64.png" 64 64
Resize-Image $source "d:\Code\Tartil-Shafai\public\logo-32.png" 32 32
Resize-Image $source "d:\Code\Tartil-Shafai\public\favicon.png" 64 64

# PWA icons
Resize-Image $source "d:\Code\Tartil-Shafai\public\icons\pwa-192x192.png" 192 192
Resize-Image $source "d:\Code\Tartil-Shafai\public\icons\pwa-512x512.png" 512 512
Resize-Image $source "d:\Code\Tartil-Shafai\public\icons\apple-touch-icon-180x180.png" 180 180

# Generate SVG and ICO favicons
node (Join-Path $PSScriptRoot "make-favicons.cjs")

Write-Host "Logo generation completed with optimal sizes."
