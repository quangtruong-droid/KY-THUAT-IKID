# ============================================================
#  IKID - SAO LUU MA NGUON
#
#  Vi sao co file nay (21/09/2026 - Truong chot sau khi soat rui ro):
#  Toan bo ma web chi nam o MOT thu muc tren MOT may tinh. May hong, cai
#  lai Win, virus ma hoa, hay don nham la web van chay nhung vinh vien
#  khong sua duoc nua. File nay nen toan bo ma thanh mot file zip co ghi
#  ngay gio, roi bo vao thu muc Drive/OneDrive de no tu day len may.
#
#  LUU Y QUAN TRONG - FILE NAY PHAI VIET KHONG DAU:
#  Windows PowerShell 5.1 doc file .ps1 theo bang ma cu, chu tieng Viet
#  co dau bien thanh ky tu rac va lam vo cu phap (da xay ra 21/09, ban
#  dau tien khong chay duoc dong nao). Dung them dau vao file nay.
#
#  Cach dung: bam dup SAO-LUU.bat.
# ============================================================

$ErrorActionPreference = 'Stop'
$goc = Split-Path -Parent $MyInvocation.MyCommand.Path
$GIU_LAI = 10     # giu bao nhieu ban gan nhat, cu hon thi tu don

function Dong($chu, $mau = 'Gray') { Write-Host $chu -ForegroundColor $mau }

# ------------------------------------------------------------
# Bao ket qua ra ngoai bang ma thoat: 0 = xong, 1 = hong.
# DEPLOY.bat doc ma nay de biet co nen day len web hay phai hoi lai.
# Khong co no thi nen hong ma van deploy, tuc la co ban tren web
# nhung khong co ban sao nao de quay ve.
# ------------------------------------------------------------
try {

Dong ""
Dong "===============================================" 'Cyan'
Dong "  IKID - SAO LUU MA NGUON" 'Cyan'
Dong "===============================================" 'Cyan'
Dong ""
Dong "Ma nguon: $goc"

# ------------------------------------------------------------
# 1) TIM CHO CAT - phai la thu muc dong bo len may, khong phai o may
# ------------------------------------------------------------
$ung = @()
if ($env:OneDriveCommercial) { $ung += @{ ten = 'OneDrive (cong ty)'; duong = $env:OneDriveCommercial } }
if ($env:OneDriveConsumer)   { $ung += @{ ten = 'OneDrive (ca nhan)'; duong = $env:OneDriveConsumer } }
if ($env:OneDrive)           { $ung += @{ ten = 'OneDrive';           duong = $env:OneDrive } }

# Google Drive cam dang o dia ao (G:, H:...) hoac thu muc trong nguoi dung
foreach ($o in (Get-PSDrive -PSProvider FileSystem -ErrorAction SilentlyContinue)) {
  $p = Join-Path $o.Root 'My Drive'
  if (Test-Path $p) { $ung += @{ ten = "Google Drive ($($o.Name):)"; duong = $p } }
}
foreach ($t in @('Google Drive', 'GoogleDrive', 'Dropbox')) {
  $p = Join-Path $env:USERPROFILE $t
  if (Test-Path $p) { $ung += @{ ten = $t; duong = $p } }
}

$ung = @($ung | Where-Object { $_.duong -and (Test-Path $_.duong) })

if ($ung.Count -eq 0) {
  Dong ""
  Dong "KHONG TIM THAY thu muc Drive hay OneDrive nao tren may nay." 'Yellow'
  Dong "Ban sao se de tam o Desktop - NHO tu keo no len Drive." 'Yellow'
  $kho = Join-Path ([Environment]::GetFolderPath('Desktop')) 'Sao luu ikid-oms'
  $tenKho = 'Desktop (TAM - nho keo len may)'
} else {
  $kho = Join-Path $ung[0].duong 'Sao luu ikid-oms'
  $tenKho = $ung[0].ten
}

if (-not (Test-Path $kho)) { New-Item -ItemType Directory -Path $kho -Force | Out-Null }
Dong "Cho cat : $tenKho"
Dong "          $kho"
Dong ""

# ------------------------------------------------------------
# 2) NEN - bo qua rac may tu sinh lai duoc, va cac file zip cu
# ------------------------------------------------------------
$luc = Get-Date -Format "yyyy-MM-dd_HHmm"
$ten = "ikid-oms_$luc.zip"
$dich = Join-Path $kho $ten

$tam = Join-Path $env:TEMP ("ikid-saoluu-" + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $tam -Force | Out-Null

$boQua = @('.wrangler', 'node_modules', '.git')
$soFile = 0
Get-ChildItem -Path $goc -Recurse -File -Force | ForEach-Object {
  $tuongDoi = $_.FullName.Substring($goc.Length).TrimStart('\')
  $phan = $tuongDoi.Split('\')[0]
  if ($boQua -contains $phan) { return }
  if ($_.Extension -eq '.zip') { return }
  $den = Join-Path $tam $tuongDoi
  $thuMuc = Split-Path -Parent $den
  if (-not (Test-Path $thuMuc)) { New-Item -ItemType Directory -Path $thuMuc -Force | Out-Null }
  Copy-Item $_.FullName -Destination $den -Force
  $script:soFile = $script:soFile + 1
}

Dong "Dang nen $soFile file..."
Compress-Archive -Path (Join-Path $tam '*') -DestinationPath $dich -Force
Remove-Item $tam -Recurse -Force -ErrorAction SilentlyContinue

$coMb = [math]::Round((Get-Item $dich).Length / 1MB, 2)
Dong ""
Dong "[OK] XONG: $ten" 'Green'
Dong "     $coMb MB - $soFile file" 'Green'

# ------------------------------------------------------------
# 3) DON BAN CU - giu 10 ban gan nhat
# ------------------------------------------------------------
$ds = @(Get-ChildItem -Path $kho -Filter 'ikid-oms_*.zip' | Sort-Object LastWriteTime -Descending)
if ($ds.Count -gt $GIU_LAI) {
  $bo = @($ds | Select-Object -Skip $GIU_LAI)
  foreach ($f in $bo) { Remove-Item $f.FullName -Force }
  Dong "Da don $($bo.Count) ban cu (giu $GIU_LAI ban gan nhat)" 'DarkGray'
}

Dong ""
Dong "Cac ban sao dang co:" 'DarkGray'
Get-ChildItem -Path $kho -Filter 'ikid-oms_*.zip' |
  Sort-Object LastWriteTime -Descending | Select-Object -First 5 | ForEach-Object {
    $m = [math]::Round($_.Length / 1MB, 2)
    Dong ("   " + $_.Name + "   " + $m + " MB") 'DarkGray'
  }

Dong ""
if ($tenKho -like 'Desktop*') {
  Dong "NHO: ban sao dang nam tren Desktop, keo len Drive thi moi an toan." 'Yellow'
} else {
  Dong "Kiem tra $tenKho da dong bo xong (co dau tich) la yen tam." 'DarkGray'
}
Dong ""
exit 0

} catch {
  Dong ""
  Dong "SAO LUU HONG: $($_.Exception.Message)" 'Red'
  Dong ""
  # don thu muc tam neu con sot, khong de rac lai trong may
  if ($tam -and (Test-Path $tam)) { Remove-Item $tam -Recurse -Force -ErrorAction SilentlyContinue }
  exit 1
}
