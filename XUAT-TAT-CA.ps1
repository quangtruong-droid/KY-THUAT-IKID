# ============================================================
#  XUAT TOAN BO DU AN KY THUAT IKID RA MOT FILE ZIP
#  (Truong yeu cau 21/10/2026: "xuat toan bo code + database va nen thanh
#   1 file zip")
#
#  FILE NAY VIET KHONG DAU - bat buoc.
#  Windows PowerShell 5.1 doc .ps1 theo bang ma cu, chu co dau thanh ky tu
#  rac va vo cu phap. Da dinh 2 lan: sao-luu.ps1 (21/09) va GOM-VE-O-D.ps1
#  (20/10, loi [char]0x1EACT dinh chu T vao so hex).
#
#  TRONG FILE ZIP CO GI:
#    1-MA-NGUON\     toan bo code web (bo .wrangler va file zip cu)
#    2-DU-LIEU\      ikid-kt.sql    - toan bo database D1, dang SQL
#                    phieu.json     - ban sao phan chu doc duoc bang mat
#    DOC-TRUOC.txt   giay ghi chu
#
#  KHONG CHUA ANH VA VIDEO. Chung nang ~840 MB nam tren kho R2, nen rieng.
#  Muon lay anh thi dung nut tai anh theo thang trong web.
# ============================================================

$ErrorActionPreference = 'Stop'
$goc = Split-Path -Parent $MyInvocation.MyCommand.Path

function Dong($chu, $mau = 'Gray') { Write-Host $chu -ForegroundColor $mau }
function Tieu($chu) { Write-Host ''; Write-Host $chu -ForegroundColor Cyan; Write-Host ('-' * 60) -ForegroundColor DarkGray }

try {
  $luc  = Get-Date -Format 'yyyy-MM-dd_HHmm'
  $tam  = Join-Path $env:TEMP ("ikid-xuat-" + $luc)
  $dMa  = Join-Path $tam '1-MA-NGUON'
  $dDu  = Join-Path $tam '2-DU-LIEU'
  New-Item -ItemType Directory -Path $dMa -Force | Out-Null
  New-Item -ItemType Directory -Path $dDu -Force | Out-Null

  # ------------------------------------------------------------
  # 1) MA NGUON
  #    Bo .wrangler (rac may tu sinh lai moi lan deploy) va *.zip
  #    (ban xuat cu, chep vao thi file phinh gap doi moi lan chay).
  # ------------------------------------------------------------
  Tieu '1/4  MA NGUON'
  robocopy $goc $dMa /E /XD '.wrangler' 'node_modules' /XF '*.zip' /NFL /NDL /NJH /NJS /NP | Out-Null
  $soMa = (Get-ChildItem $dMa -Recurse -File -Force).Count
  Dong "  $soMa file" 'Green'

  # ------------------------------------------------------------
  # 2) DATABASE D1 -> SQL
  #    --remote la bat buoc: khong co no wrangler xuat ban LOCAL rong tuech
  #    (ban local chi dung cho wrangler dev, chua tung co du lieu that).
  # ------------------------------------------------------------
  Tieu '2/4  DATABASE D1 (ikid-kt)'
  $fSql = Join-Path $dDu 'ikid-kt.sql'
  Dong '  Dang hoi Cloudflare... (lan dau co the mat 30-60 giay)'
  Push-Location $goc
  try {
    & npx wrangler d1 export ikid-kt --remote --output="$fSql" 2>&1 | ForEach-Object { Dong ("    " + $_) 'DarkGray' }
  } finally { Pop-Location }

  if (Test-Path $fSql) {
    $kb = [math]::Round((Get-Item $fSql).Length / 1KB)
    $dong = (Get-Content $fSql | Measure-Object -Line).Lines
    Dong "  OK - ikid-kt.sql : $kb KB, $dong dong" 'Green'
  } else {
    Dong '  KHONG XUAT DUOC DATABASE.' 'Red'
    Dong '  Thuong la do chua dang nhap Cloudflare. Chay: npx wrangler login' 'Yellow'
    Dong '  Van nen tiep phan ma nguon.' 'Yellow'
  }

  # ------------------------------------------------------------
  # 3) BAN SAO PHAN CHU (JSON) - de doc bang mat, khong can cai gi
  #    Lay tu ban sao luu web tu cat moi dem. Khong bat buoc: hong thi bo qua.
  # ------------------------------------------------------------
  Tieu '3/4  BAN SAO PHAN CHU (JSON)'
  try {
    $hn = Get-Date -Format 'yyyy-MM-dd'
    $u  = "https://ikid-oms.quangtruong.workers.dev/api/sao-luu-tai?t=$hn"
    $fJson = Join-Path $dDu 'phieu.json'
    Invoke-WebRequest -Uri $u -OutFile $fJson -TimeoutSec 60 -ErrorAction Stop
    $kb2 = [math]::Round((Get-Item $fJson).Length / 1KB)
    Dong "  OK - phieu.json : $kb2 KB" 'Green'
  } catch {
    Dong '  Bo qua (duong nay doi ve phien, chay tu dong khong lay duoc).' 'Yellow'
    Dong '  Muon co file nay: mo web -> Trang ca nhan -> Kho anh va don du lieu' 'Yellow'
    Dong '  -> nut "Tai ban ... ve may", roi tu bo vao thu muc 2-DU-LIEU.' 'Yellow'
  }

  # ------------------------------------------------------------
  # 4) GIAY GHI CHU + NEN
  # ------------------------------------------------------------
  Tieu '4/4  NEN LAI'
  $ghi = @"
DU AN KY THUAT IKID - BAN XUAT TOAN BO
Xuat luc: $(Get-Date -Format 'dd/MM/yyyy HH:mm')
Web: https://ikid-oms.quangtruong.workers.dev

================================================================
TRONG DAY CO GI
================================================================

1-MA-NGUON\
    Toan bo code web. Day la BAN VE, khong phai du lieu.
    Muon chay lai web tu day:
        cd <thu muc nay>
        npx wrangler deploy

2-DU-LIEU\ikid-kt.sql
    Toan bo database D1: phieu loi, tin trao doi, nguoi, co so, gian hang,
    so thong bao, nhat ky. Dang SQL - dung de dung lai database tu dau:
        npx wrangler d1 execute ikid-kt --remote --file=ikid-kt.sql

2-DU-LIEU\phieu.json
    Cung du lieu do nhung dang de doc. Mo bang Notepad hay trinh duyet
    cung xem duoc. Khong co file nay cung khong sao, ban .sql moi la chinh.

================================================================
KHONG CO GI TRONG DAY
================================================================

ANH VA VIDEO - khoang 840 MB, nam tren kho R2 cua Cloudflare.
Khong nen chung vao day vi file zip se phinh len gan 1 GB.
Muon lay anh: mo web -> Trang ca nhan -> Kho anh va don du lieu.

================================================================
DUNG BAN NAY DE DUNG LAI WEB NHU THE NAO
================================================================

1. Tao database moi:   npx wrangler d1 create ikid-kt
2. Dan database_id no in ra vao wrangler.toml
3. Nap du lieu:        npx wrangler d1 execute ikid-kt --remote --file=ikid-kt.sql
4. Tao kho anh:        npx wrangler r2 bucket create ikid-minhchung
5. Day web len:        npx wrangler deploy

Anh/video cu se khong con, phieu va tin nhan thi con nguyen.
"@
  $ghi | Out-File -FilePath (Join-Path $tam 'DOC-TRUOC.txt') -Encoding UTF8

  $kho = Join-Path (Split-Path -Parent $goc) 'BAN-XUAT'
  if (-not (Test-Path $kho)) { New-Item -ItemType Directory -Path $kho -Force | Out-Null }
  $zip = Join-Path $kho ("IKID-TOAN-BO_" + $luc + ".zip")
  if (Test-Path $zip) { Remove-Item $zip -Force }
  Compress-Archive -Path (Join-Path $tam '*') -DestinationPath $zip -CompressionLevel Optimal

  Remove-Item $tam -Recurse -Force -ErrorAction SilentlyContinue

  $mb = [math]::Round((Get-Item $zip).Length / 1MB, 1)
  Tieu 'XONG'
  Dong "  $zip" 'Green'
  Dong "  $mb MB" 'Green'
  Dong ''
  Dong 'Cat file nay ra o cung ngoai hoac Drive la an toan nhat.' 'Yellow'
  Start-Process explorer.exe ('/select,"' + $zip + '"')
  exit 0

} catch {
  Dong ''
  Dong 'CO LOI:' 'Red'
  Dong $_.Exception.Message 'Red'
  Dong ''
  Dong 'Chup man hinh nay gui lai.' 'Yellow'
  exit 1
}
