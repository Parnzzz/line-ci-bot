$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

$width = 2500
$height = 843
$outputPath = Join-Path $PSScriptRoot "..\public\rich-menu.png"
$bitmap = [System.Drawing.Bitmap]::new(
  $width,
  $height,
  [System.Drawing.Imaging.PixelFormat]::Format24bppRgb
)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

function New-RoundedPath {
  param(
    [float]$X,
    [float]$Y,
    [float]$Width,
    [float]$Height,
    [float]$Radius
  )

  $diameter = $Radius * 2
  $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $path.AddArc($X, $Y, $diameter, $diameter, 180, 90)
  $path.AddArc($X + $Width - $diameter, $Y, $diameter, $diameter, 270, 90)
  $path.AddArc(
    $X + $Width - $diameter,
    $Y + $Height - $diameter,
    $diameter,
    $diameter,
    0,
    90
  )
  $path.AddArc($X, $Y + $Height - $diameter, $diameter, $diameter, 90, 90)
  $path.CloseFigure()
  return $path
}

function Draw-RoundedCard {
  param(
    [System.Drawing.Graphics]$Graphics,
    [float]$X,
    [float]$Y,
    [float]$Width,
    [float]$Height,
    [System.Drawing.Color]$StartColor,
    [System.Drawing.Color]$EndColor
  )

  $bounds = [System.Drawing.Rectangle]::new(
    [int]$X,
    [int]$Y,
    [int]$Width,
    [int]$Height
  )
  $path = New-RoundedPath -X $X -Y $Y -Width $Width -Height $Height -Radius 58
  $brush = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
    $bounds,
    $StartColor,
    $EndColor,
    [System.Drawing.Drawing2D.LinearGradientMode]::ForwardDiagonal
  )
  $Graphics.FillPath($brush, $path)
  $brush.Dispose()
  $path.Dispose()
}

function Draw-CenteredText {
  param(
    [System.Drawing.Graphics]$Graphics,
    [string]$Text,
    [System.Drawing.RectangleF]$Bounds,
    [float]$Size,
    [System.Drawing.Color]$Color,
    [System.Drawing.FontStyle]$Style = [System.Drawing.FontStyle]::Regular
  )

  $font = [System.Drawing.Font]::new(
    "Segoe UI",
    $Size,
    $Style,
    [System.Drawing.GraphicsUnit]::Pixel
  )
  $brush = [System.Drawing.SolidBrush]::new($Color)
  $format = [System.Drawing.StringFormat]::new()
  $format.Alignment = [System.Drawing.StringAlignment]::Center
  $format.LineAlignment = [System.Drawing.StringAlignment]::Center
  $format.Trimming = [System.Drawing.StringTrimming]::EllipsisCharacter
  $Graphics.DrawString($Text, $font, $brush, $Bounds, $format)
  $format.Dispose()
  $brush.Dispose()
  $font.Dispose()
}

try {
  $background = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
    [System.Drawing.Rectangle]::new(0, 0, $width, $height),
    [System.Drawing.ColorTranslator]::FromHtml("#091426"),
    [System.Drawing.ColorTranslator]::FromHtml("#182444"),
    [System.Drawing.Drawing2D.LinearGradientMode]::ForwardDiagonal
  )
  $graphics.FillRectangle($background, 0, 0, $width, $height)
  $background.Dispose()

  $decorBrush = [System.Drawing.SolidBrush]::new(
    [System.Drawing.Color]::FromArgb(18, 107, 151, 255)
  )
  $graphics.FillEllipse($decorBrush, 2050, -250, 650, 650)
  $graphics.FillEllipse($decorBrush, -270, 665, 520, 520)
  $decorBrush.Dispose()

  $white = [System.Drawing.Color]::FromArgb(255, 247, 249, 255)
  $mutedWhite = [System.Drawing.Color]::FromArgb(220, 222, 230, 245)
  Draw-CenteredText -Graphics $graphics -Text "ARAYATIME FLUTTER CI" `
    -Bounds ([System.Drawing.RectangleF]::new(60, 42, 2380, 90)) `
    -Size 64 -Color $white -Style ([System.Drawing.FontStyle]::Bold)
  Draw-CenteredText -Graphics $graphics -Text "เมนูด่วนสำหรับติดตามสถานะ Build" `
    -Bounds ([System.Drawing.RectangleF]::new(60, 138, 2380, 58)) `
    -Size 32 -Color $mutedWhite

  Draw-RoundedCard -Graphics $graphics -X 70 -Y 242 -Width 1160 -Height 535 `
    -StartColor ([System.Drawing.ColorTranslator]::FromHtml("#2878F0")) `
    -EndColor ([System.Drawing.ColorTranslator]::FromHtml("#1451B8"))
  Draw-RoundedCard -Graphics $graphics -X 1270 -Y 242 -Width 1160 -Height 535 `
    -StartColor ([System.Drawing.ColorTranslator]::FromHtml("#8447E8")) `
    -EndColor ([System.Drawing.ColorTranslator]::FromHtml("#542FB8"))

  $iconCircle = [System.Drawing.SolidBrush]::new(
    [System.Drawing.Color]::FromArgb(45, 255, 255, 255)
  )
  $leftCenterX = 650
  $rightCenterX = 1850
  $iconCenterY = 420
  $graphics.FillEllipse($iconCircle, $leftCenterX - 92, $iconCenterY - 92, 184, 184)
  $graphics.FillEllipse($iconCircle, $rightCenterX - 92, $iconCenterY - 92, 184, 184)
  $iconCircle.Dispose()

  $iconPen = [System.Drawing.Pen]::new($white, 15)
  $iconPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $iconPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $iconPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round

  # Status chart icon.
  $graphics.DrawLine($iconPen, $leftCenterX - 58, $iconCenterY + 45, $leftCenterX + 58, $iconCenterY + 45)
  $graphics.DrawLine($iconPen, $leftCenterX - 48, $iconCenterY + 22, $leftCenterX - 15, $iconCenterY - 6)
  $graphics.DrawLine($iconPen, $leftCenterX - 15, $iconCenterY - 6, $leftCenterX + 14, $iconCenterY + 13)
  $graphics.DrawLine($iconPen, $leftCenterX + 14, $iconCenterY + 13, $leftCenterX + 52, $iconCenterY - 37)

  # Build report icon.
  $documentPath = New-RoundedPath -X ($rightCenterX - 48) -Y ($iconCenterY - 59) `
    -Width 96 -Height 118 -Radius 12
  $graphics.DrawPath($iconPen, $documentPath)
  $documentPath.Dispose()
  $graphics.DrawLine($iconPen, $rightCenterX - 22, $iconCenterY - 23, $rightCenterX + 20, $iconCenterY - 23)
  $graphics.DrawLine($iconPen, $rightCenterX - 22, $iconCenterY + 3, $rightCenterX - 8, $iconCenterY + 20)
  $graphics.DrawLine($iconPen, $rightCenterX - 8, $iconCenterY + 20, $rightCenterX + 25, $iconCenterY - 14)
  $iconPen.Dispose()

  Draw-CenteredText -Graphics $graphics -Text "ดูสถานะ CI" `
    -Bounds ([System.Drawing.RectangleF]::new(120, 548, 1060, 86)) `
    -Size 61 -Color $white -Style ([System.Drawing.FontStyle]::Bold)
  Draw-CenteredText -Graphics $graphics -Text "ตรวจสถานะงานที่กำลังทำงาน" `
    -Bounds ([System.Drawing.RectangleF]::new(120, 644, 1060, 60)) `
    -Size 31 -Color $mutedWhite
  Draw-CenteredText -Graphics $graphics -Text "ผล Build ล่าสุด" `
    -Bounds ([System.Drawing.RectangleF]::new(1320, 548, 1060, 86)) `
    -Size 61 -Color $white -Style ([System.Drawing.FontStyle]::Bold)
  Draw-CenteredText -Graphics $graphics -Text "ดูผลสำเร็จหรือข้อผิดพลาดล่าสุด" `
    -Bounds ([System.Drawing.RectangleF]::new(1320, 644, 1060, 60)) `
    -Size 31 -Color $mutedWhite

  $outputDirectory = Split-Path -Parent $outputPath
  New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null
  $bitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $file = Get-Item -LiteralPath $outputPath
  Write-Output "Created $($file.FullName) ($($file.Length) bytes)"
} finally {
  $graphics.Dispose()
  $bitmap.Dispose()
}
