Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Bitmap]::FromFile('C:\Users\Soumya\.gemini\antigravity-ide\brain\67f3a052-29fa-4861-808d-73451da0ac59\.user_uploaded\media_1788978132225.png')

for ($x = 20; $x -lt 60; $x += 2) {
  $p = $img.GetPixel($x, 150)
  $hex = "#{0:X2}{1:X2}{2:X2}" -f $p.R, $p.G, $p.B
  Write-Host "x=$x : $hex"
}
$img.Dispose()
