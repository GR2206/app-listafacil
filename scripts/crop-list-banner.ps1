Add-Type -AssemblyName System.Drawing

$srcPath = Join-Path $PSScriptRoot '..\assets\list_banner_design.png'
$outPath = Join-Path $PSScriptRoot '..\assets\list_banner_300x50.png'

$src = [System.Drawing.Image]::FromFile($srcPath)
$tw = 300
$th = 50
$sw = $src.Width
$sh = $src.Height

# Franja horizontal centrada en el arte del banner (incluye las 3 líneas + $).
$cropW = $sw
$cropH = [int]($sw / ($tw / $th))
$left = 0
$top = [int]($sh * 0.23)
$cropH = [int]($cropH * 1.22)

if ($top + $cropH -gt $sh) {
  $top = [Math]::Max(0, $sh - $cropH)
}

$crop = New-Object System.Drawing.Bitmap $cropW, $cropH
$g = [System.Drawing.Graphics]::FromImage($crop)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$srcRect = New-Object System.Drawing.Rectangle $left, $top, $cropW, $cropH
$destRect = New-Object System.Drawing.Rectangle 0, 0, $cropW, $cropH
$g.DrawImage($src, $destRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
$g.Dispose()
$src.Dispose()

$dest = New-Object System.Drawing.Bitmap $tw, $th
$g2 = [System.Drawing.Graphics]::FromImage($dest)
$g2.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g2.DrawImage($crop, 0, 0, $tw, $th)
$g2.Dispose()
$crop.Dispose()

$dest.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
$dest.Dispose()

Write-Output "Saved $outPath (crop ${cropW}x${cropH} @ top=$top -> ${tw}x${th})"
