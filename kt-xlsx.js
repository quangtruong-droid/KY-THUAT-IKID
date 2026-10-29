/* ============================================================
   Kỹ thuật IKID · Tạo file Excel .xlsx THẬT — không thư viện.
   Vì sao: bản cũ xuất CSV dấu chấm phẩy, Excel máy để chuẩn Mỹ
   là nhét cả dòng vào một cột — "bố ai hiểu được" (Trường 21/08).
   .xlsx là một file zip chứa vài file XML; tự đóng zip (không nén)
   + tự tính CRC32 là đủ, Excel/Google Sheets/LibreOffice đều mở được.
   ============================================================ */
'use strict';

/* ---------- CRC32 (bắt buộc phải có trong zip) ---------- */
const XLSX_CRC_BANG = (() => {
  const b = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    b[n] = c >>> 0;
  }
  return b;
})();
function xlsxCrc(u8) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < u8.length; i++) c = XLSX_CRC_BANG[(c ^ u8[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

/* ---------- đóng zip kiểu "stored" (không nén — file bé sẵn rồi) ---------- */
function xlsxZip(dsFile) {
  const ma = new TextEncoder();
  const phan = [], muclu = [];
  let offset = 0;
  for (const f of dsFile) {
    const ten = ma.encode(f.ten);
    const du = typeof f.du === 'string' ? ma.encode(f.du) : f.du;
    const crc = xlsxCrc(du);
    const dau = new DataView(new ArrayBuffer(30));
    dau.setUint32(0, 0x04034b50, true); dau.setUint16(4, 20, true);
    dau.setUint32(14, crc, true); dau.setUint32(18, du.length, true); dau.setUint32(22, du.length, true);
    dau.setUint16(26, ten.length, true);
    phan.push(new Uint8Array(dau.buffer), ten, du);
    const md = new DataView(new ArrayBuffer(46));
    md.setUint32(0, 0x02014b50, true); md.setUint16(4, 20, true); md.setUint16(6, 20, true);
    md.setUint32(16, crc, true); md.setUint32(20, du.length, true); md.setUint32(24, du.length, true);
    md.setUint16(28, ten.length, true); md.setUint32(42, offset, true);
    muclu.push(new Uint8Array(md.buffer), ten);
    offset += 30 + ten.length + du.length;
  }
  const daiMl = muclu.reduce((s, x) => s + x.length, 0);
  const duoi = new DataView(new ArrayBuffer(22));
  duoi.setUint32(0, 0x06054b50, true);
  duoi.setUint16(8, dsFile.length, true); duoi.setUint16(10, dsFile.length, true);
  duoi.setUint32(12, daiMl, true); duoi.setUint32(16, offset, true);
  const tat = [...phan, ...muclu, new Uint8Array(duoi.buffer)];
  const ra = new Uint8Array(tat.reduce((s, x) => s + x.length, 0));
  let v = 0; for (const x of tat) { ra.set(x, v); v += x.length; }
  return ra;
}

/* ---------- dựng ruột xlsx ---------- */
const xlsxEsc = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
const xlsxCot = i => { let t = ''; i++; while (i > 0) { const d = (i - 1) % 26; t = String.fromCharCode(65 + d) + t; i = Math.floor((i - 1) / 26); } return t; };

/* cot: ['Mã','Nội dung',…] · dong: mảng mảng, số để trần thì ra ô SỐ trong Excel */
function taoXLSX(tenSheet, cot, dong) {
  const oHang = (ds, kieuS) => '<row>' + ds.map((v, i) => {
    if (typeof v === 'number' && isFinite(v)) return '<c s="' + (kieuS ? 1 : 0) + '"><v>' + v + '</v></c>';
    const chu = xlsxEsc(v);
    return chu === '' ? '<c/>' : '<c t="inlineStr" s="' + (kieuS ? 1 : 0) + '"><is><t xml:space="preserve">' + chu + '</t></is></c>';
  }).join('') + '</row>';

  /* độ rộng cột: theo chữ dài nhất trong 200 dòng đầu, kẹp 8–52 */
  const rong = cot.map((c, i) => {
    let m = String(c).length;
    for (const d of dong.slice(0, 200)) m = Math.max(m, String(d[i] == null ? '' : d[i]).length);
    return Math.min(52, Math.max(8, m + 2));
  });
  const vungLoc = 'A1:' + xlsxCot(cot.length - 1) + (dong.length + 1);

  const sheet = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
    '<cols>' + rong.map((r, i) => '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + r + '" customWidth="1"/>').join('') + '</cols>' +
    '<sheetData>' + oHang(cot, true) + dong.map(d => oHang(d, false)).join('') + '</sheetData>' +
    '<autoFilter ref="' + vungLoc + '"/></worksheet>';

  const styles = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font>' +
    '<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts>' +
    '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>' +
    '<fill><patternFill patternType="solid"><fgColor rgb="FF0E7490"/></patternFill></fill></fills>' +
    '<borders count="1"><border/></borders>' +
    '<cellStyleXfs count="1"><xf/></cellStyleXfs>' +
    '<cellXfs count="2"><xf xfId="0"/><xf xfId="0" fontId="1" fillId="2" applyFont="1" applyFill="1"/></cellXfs>' +
    '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
    '</styleSheet>';

  return xlsxZip([
    { ten: '[Content_Types].xml', du: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>' },
    { ten: '_rels/.rels', du: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' },
    { ten: 'xl/workbook.xml', du: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="' + xlsxEsc(tenSheet).slice(0, 31) + '" sheetId="1" r:id="rId1"/></sheets></workbook>' },
    { ten: 'xl/_rels/workbook.xml.rels', du: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>' },
    { ten: 'xl/styles.xml', du: styles },
    { ten: 'xl/worksheets/sheet1.xml', du: sheet }
  ]);
}

/* tải xuống */
function taiXLSX(tenFile, tenSheet, cot, dong) {
  const u8 = taoXLSX(tenSheet, cot, dong);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([u8], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  a.download = tenFile;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
