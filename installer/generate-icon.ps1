$w = 32; $h = 32
$px = New-Object byte[] ($w * $h * 4)
$i = 0
for ($y = $h-1; $y -ge 0; $y--) {
    for ($x = 0; $x -lt $w; $x++) {
        $cx = $x - 15.5; $cy = $y - 15.5; $d = [Math]::Sqrt($cx*$cx + $cy*$cy)
        if ($d -le 14 -and $d -ge 10) { $px[$i]=0; $px[$i+1]=229; $px[$i+2]=160; $px[$i+3]=255 }
        elseif ($d -le 7.5 -and $d -ge 4) { $px[$i]=0; $px[$i+1]=229; $px[$i+2]=160; $px[$i+3]=255 }
        else { $px[$i]=0; $px[$i+1]=7; $px[$i+2]=16; $px[$i+3]=10 }
        $i += 4
    }
}
$and = New-Object byte[] 128
$hdr = New-Object byte[] 40
$hdr[0]=0x28; $hdr[4]=$w; $hdr[8]=$h*2; $hdr[12]=1; $hdr[14]=32

# ICO header: reserved(2) + type(2) + count(2)
$ico = New-Object byte[] (6 + 16 + 40 + $px.Length + $and.Length)
$ico[2]=1; $ico[4]=1

# Directory entry (offset 6)
$ico[6]=$w; $ico[7]=$h
$ico[10]=1; $ico[12]=32
$imgSize = 40 + $px.Length + $and.Length
$ico[14]=$imgSize -band 0xFF; $ico[15]=($imgSize -shr 8)-band 0xFF
$ico[16]=($imgSize -shr 16)-band 0xFF; $ico[17]=($imgSize -shr 24)-band 0xFF
$ico[22]=22

# Copy header + pixels + and mask after directory entry
$hdr.CopyTo($ico, 22)
$px.CopyTo($ico, 62)
$and.CopyTo($ico, 62 + $px.Length)

[System.IO.File]::WriteAllBytes("$PSScriptRoot\app.ico", $ico)
Write-Output "Icon generated"
