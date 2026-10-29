/* ============================================================
   WEB KỸ THUẬT – CƠ SỞ · Màn QUẢN LÝ
   Vì web cũ đã dừng: thêm/sửa cơ sở, gian hàng, người vào web
   ngay trong web này. Chỉ vai "quanly" thấy.
   ============================================================ */
'use strict';

let QL_TAB = 'coso';   // coso | nguoi
/* ============================================================
   LÙI TỪNG LỚP (Trường bắt 08/09: "mỗi lần x đi toàn quay trở lại từ đầu rồi
   lại phải ấn lại rất mất thời gian"). QL_VE ghi màn trước là gì, nên sửa xong
   hay bấm ‹ Quay lại là về ĐÚNG chỗ vừa đứng, không sập về màn gốc.
   QL_VE = 'goc' hoặc 'cs:<mã cơ sở>'
   ============================================================ */
let QL_VE = 'goc';
/* Nhớ chỗ đang cuộn của từng màn (luật 08/09: "đừng giật lại lên đầu, phải lưu
   lại vị trí đó khi vào"). Rời màn nào thì ghi lại, vẽ lại màn đó thì trả về. */
const QL_CUON = {};
function qlGhiCuon() {
  const noi = document.querySelector('#sheet .sheetNoi');
  if (noi && QL_VE) QL_CUON[QL_VE] = noi.scrollTop;
}
function qlTraCuon(man) {
  const y = QL_CUON[man] || 0;
  if (!y) return;
  /* đợi tấm trượt vẽ xong rồi mới trả chỗ cuộn, không thì bị ghi đè */
  requestAnimationFrame(() => {
    const noi = document.querySelector('#sheet .sheetNoi');
    if (noi) noi.scrollTop = y;
  });
}
function qlVeMan(ve) {
  if (ve && ve.indexOf('cs:') === 0) return formQLCoSo(ve.slice(3));
  return formQuanLy();
}
/* nút ‹ ở đầu tiêu đề mọi màn con */
const qlNutLui = ve => '<button class="qlLui" data-qlve="' + esc(ve || 'goc') + '" title="Quay lại">‹</button>';

function formQuanLy() {
  if (!laQuanLy()) { nhac('Chỉ quản lý mở được màn này', 'do'); return; }
  if (QL_TAB === 'gianhang') QL_TAB = 'coso';        /* tab Gian hàng đã gộp vào cơ sở */
  qlGhiCuon();
  QL_VE = 'goc';
  moSheet(khungSheet('Quản lý', 'Cơ sở · gian hàng · người vào web',
    '<div class="qlTab">' +
    ['coso|Cơ sở|' + D.cosos.length, 'nguoi|Người vào web|' + D.ai.length]
      .map(x => { const [k, t, n] = x.split('|'); return '<button data-qltab="' + k + '" class="' + (QL_TAB === k ? 'on' : '') + '">' + t + ' <i>' + n + '</i></button>'; }).join('') +
    '</div><div id="qlNoi">' + veQL() + '</div>',
    '<button class="btn v chiPC" data-qlxuat="1">⤓ Xuất danh sách</button>' +
    '<button class="btn v" style="flex:1" data-dongsheet="1">Đóng</button>'));
  /* hộp trượt nở to — màn này có bảng hai cột, hộp hẹp là bóp nát cột phải */
  if (typeof sheetTo === 'function') sheetTo();
  doQLRong();
  qlTraCuon('goc');
}

/* ============================================================
   ĐO BỀ RỘNG THẬT RỒI MỚI CHIA CỘT (16/10 — vá lỗi).
   Bản đầu dùng @media(min-width:901px) nên đo màn hình: màn 1707px mà hộp
   trượt chỉ 610px vẫn bị áp lưới hai cột, cột phải còn 257px, chữ nát.
   Giờ đo đúng khối .qlHai. Ngưỡng 720px = 320 cột trái + 13 khe + 387 cột
   phải — dưới mức đó thì form hai cột bắt đầu chật.
   Gọi lại mỗi lần vẽ và mỗi khi đổi cỡ cửa sổ.
   ============================================================ */
function doQLRong() {
  requestAnimationFrame(() => {
    const el = document.querySelector('.qlHai');
    if (!el) return;
    el.classList.toggle('rong', el.getBoundingClientRect().width >= 720);
  });
}
window.addEventListener('resize', () => { if (document.querySelector('.qlHai')) doQLRong(); });

/* ============================================================
   XUẤT DANH SÁCH CƠ SỞ · GIAN HÀNG · NGƯỜI (02/10 — Trường xin).
   Trước nay muốn có bảng này phải ngồi chép tay từng dòng trên màn hình.
   Giờ một nút: sao chép thẳng vào bộ nhớ tạm để dán sang Zalo, hoặc tải về
   file Excel mở bằng máy tính.
   Lấy từ dữ liệu ĐANG CÓ TRONG MÁY, không gọi thêm máy chủ — bấm là ra ngay.
   Người đã ẩn không tính: danh sách này để gửi cho nhau, kê tên người nghỉ
   vào chỉ tổ gây nhầm.
   ============================================================ */
function dsCoSoDayDu() {
  /* xếp CS01…CS12 trước theo số, mã lạ (ANPHNG) xuống cuối — đúng thứ tự mọi
     người quen nhìn, chứ xếp theo chữ cái thì Đan Phượng nhảy lên đầu */
  const soCua = id => { const m = /^CS(\d+)$/.exec(String(id)); return m ? Number(m[1]) : 9999; };
  const cs = (D.cosos || []).slice().sort((a, b) =>
    (soCua(a.id) - soCua(b.id)) || String(a.ten).localeCompare(String(b.ten), 'vi'));
  const TT = { hoatdong: 'Đang hoạt động', sapkhaitruong: 'Sắp khai trương', dong: 'Đã đóng' };
  return cs.map((c, i) => {
    /* ============================================================
       TÀI KHOẢN CHUNG KHÔNG PHẢI LÀ CHT (02/10).
       Mỗi cơ sở lúc mới mở đều có một tài khoản chung mang đúng tên cơ sở,
       mã bắt đầu bằng "cs_". Kê nó vào cột CHT thì bảng hiện "CHT: Aeon Mall
       Hải Dương" — vô nghĩa, mà còn che mất việc cơ sở đó CHƯA có người phụ
       trách thật. Chỉ tính người có tài khoản riêng.
       ============================================================ */
    const nguoi = (D.ai || []).filter(a => a.vai === 'coso' && a.coSoId === c.id);
    const that = nguoi.filter(a => String(a.id).indexOf('cs_') !== 0);
    const chung = nguoi.length > that.length;
    const gh = (D.gianhangs || []).filter(g => g.coSoId === c.id).map(g => g.ten).sort();
    return {
      stt: i + 1, ma: c.id, ten: c.ten,
      trangThai: TT[c.trangThai] || c.trangThai || '',
      cht: that.length ? that.map(a => a.ten).join(' / ')
        : (chung ? '— chưa gán, đang dùng tài khoản chung —' : '— chưa gán —'),
      soGian: gh.length,
      gian: gh.length ? gh.join(', ') : '— chưa có gian hàng —'
    };
  });
}
/* bản chữ để dán vào Zalo — xếp theo cột, nhìn trên điện thoại vẫn đọc được */
function dsCoSoChuoi() {
  const ds = dsCoSoDayDu();
  const tho = (D.ai || []).filter(a => a.vai === 'tho').map(a => a.ten);
  const d = new Date();
  const hai = n => String(n).padStart(2, '0');
  let s = 'DANH SÁCH CƠ SỞ · GIAN HÀNG · CHT\n';
  s += 'Kỹ thuật IKID — ' + hai(d.getDate()) + '/' + hai(d.getMonth() + 1) + '/' + d.getFullYear() + '\n';
  s += ds.length + ' cơ sở · ' + ds.reduce((t, x) => t + x.soGian, 0) + ' gian hàng\n\n';
  ds.forEach(x => {
    s += x.stt + '. ' + x.ten + (x.trangThai === 'Sắp khai trương' ? ' (sắp khai trương)' : '') + '\n';
    s += '   CHT: ' + x.cht + '\n';
    s += '   Gian hàng: ' + x.gian + '\n\n';
  });
  s += 'KỸ THUẬT (' + tho.length + '): ' + tho.join(', ') + '\n';
  return s;
}
function formQLXuat() {
  const ds = dsCoSoDayDu();
  const tho = (D.ai || []).filter(a => a.vai === 'tho').map(a => a.ten);
  const soGian = ds.reduce((t, x) => t + x.soGian, 0);
  const thieuCht = ds.filter(x => x.cht.indexOf('chưa gán') >= 0).length;
  const thieuGian = ds.filter(x => !x.soGian).length;
  moSheet(khungSheet('⤓ Xuất danh sách', 'Cơ sở · gian hàng · CHT phụ trách — lấy từ dữ liệu đang có',
    '<div class="qlNhac" style="background:#ECFEFF;border-color:#A5DCEA;color:#0E5C70">' +
    '<b>' + ds.length + ' cơ sở · ' + soGian + ' gian hàng · ' +
    (D.ai || []).filter(a => a.vai === 'coso').length + ' CHT · ' + tho.length + ' kỹ thuật</b>' +
    (thieuCht || thieuGian
      ? '<div style="margin-top:5px;color:#B45309">⚠ ' +
        [thieuCht ? thieuCht + ' cơ sở chưa gán CHT' : '', thieuGian ? thieuGian + ' cơ sở chưa khai gian hàng' : '']
          .filter(Boolean).join(' · ') + '</div>'
      : '') + '</div>' +
    '<button class="mn" data-qlchep="1"><div class="ic" style="background:#DCFCE7;color:#15803D">⧉</div>' +
    '<div><b>Sao chép</b><div class="s">dán thẳng vào Zalo, tin nhắn, ghi chú</div></div><span class="mui">›</span></button>' +
    '<button class="mn" data-qltaixls="1"><div class="ic" style="background:#E0F2FE;color:#0369A1">⤓</div>' +
    '<div><b>Tải file Excel</b><div class="s">mở bằng Excel trên máy tính, in ra được</div></div><span class="mui">›</span></button>' +
    '<div class="f" style="margin-top:10px"><label>XEM TRƯỚC</label>' +
    '<textarea class="ip" id="ql_xem" readonly style="height:210px;font-size:12px;line-height:1.5">' +
    esc(dsCoSoChuoi()) + '</textarea>' +
    '<div class="hint">Không sao chép được thì bấm vào ô này, chọn hết rồi chép tay.</div></div>',
    '<button class="btn v" data-qlve="goc">‹ Quay lại</button>' +
    '<button class="btn v" style="flex:1" data-dongsheet="1">Đóng</button>'));
}
async function qlChepDs() {
  const s = dsCoSoChuoi();
  try {
    await navigator.clipboard.writeText(s);
    nhac('Đã sao chép — dán vào Zalo là ra', 'la');
  } catch (e) {
    /* iPhone chặn clipboard khi không phải cú bấm trực tiếp — lùi về chọn sẵn
       chữ trong ô để người dùng bấm Copy của máy */
    const o = document.getElementById('ql_xem');
    if (o) { o.focus(); o.select(); o.setSelectionRange(0, 999999); }
    nhac('Máy không cho chép tự động — chữ đã bôi đen sẵn, bấm Copy', 'canh');
  }
}
function qlTaiDsXls() {
  if (typeof taiXLSX !== 'function') { nhac('Chưa nạp được phần xuất Excel', 'do'); return; }
  const d = new Date();
  const hai = n => String(n).padStart(2, '0');
  const ten = 'IKID-coso-gianhang-' + d.getFullYear() + hai(d.getMonth() + 1) + hai(d.getDate()) + '.xlsx';
  const dong = dsCoSoDayDu().map(x => [x.stt, x.ma, x.ten, x.trangThai, x.cht, x.soGian, x.gian]);
  taiXLSX(ten, 'Cơ sở', ['STT', 'Mã', 'Cơ sở', 'Tình trạng', 'CHT phụ trách', 'Số gian', 'Các gian hàng'], dong);
  nhac('Đã tải ' + ten, 'la');
}

/* ============================================================
   MÀN CỦA MỘT CƠ SỞ (Trường chốt 08/09: "cho tao chỉnh sửa luôn gian hàng
   trong cơ sở thay vì cơ sở riêng và gian hàng riêng").
   Vào đây là làm được hết: đổi tên cơ sở, xoá cơ sở, và cả danh sách gian hàng
   của chính cơ sở đó — thêm, sửa tên, xoá ngay tại chỗ.
   ============================================================ */
function formQLCoSo(id) {
  const c = D.cosos.find(x => x.id === id);
  if (!c) return formQuanLy();
  qlGhiCuon();
  QL_VE = 'cs:' + id;
  const gh = D.gianhangs.filter(g => g.coSoId === id);
  const soPhieu = D.phieu.filter(p => p.coSoId === id && p.trangThai !== 'huy').length;
  const ng = (D.ai || []).filter(a => a.coSoId === id);
  const dsGh = gh.length
    ? gh.map(g => {
      const sl = D.phieu.filter(p => p.gianHangId === g.id && p.trangThai !== 'huy').length;
      return '<div class="qlDong"><b>' + esc(g.ten) + '</b>' +
        '<div class="s">' + esc(g.id) + (sl ? ' · ' + sl + ' phiếu' : ' · chưa có phiếu nào') + '</div>' +
        '<button class="qlSua" data-qlsua="gianhang" data-id="' + esc(g.id) + '">Sửa tên</button>' +
        '<button class="qlXoa" data-qlxoa="gianhang" data-id="' + esc(g.id) + '">Xoá</button></div>';
    }).join('')
    : '<div class="qlNhac">Cơ sở này chưa có gian hàng nào. Cơ sở phải có gian hàng thì CHT mới báo lỗi được.</div>';
  moSheet(khungSheet(qlNutLui('goc') + esc(c.ten),
    esc(id) + ' · ' + gh.length + ' gian hàng · ' + soPhieu + ' phiếu' + (ng.length ? ' · ' + ng.length + ' người phụ trách' : ''),
    '<div class="qlNhomD">CƠ SỞ</div>' +
    '<button class="mn" data-qlsua="coso" data-id="' + esc(id) + '"><div class="ic" style="background:#E0F2FE;color:#0369A1"><img width="22" height="22" class="mnIc" src="ic/cho-duyet.webp" alt="" loading="lazy"></div>' +
    '<div><b>Sửa tên cơ sở</b><div class="s">đang là "' + esc(c.ten) + '"</div></div><span class="mui">›</span></button>' +
    /* ============================================================
       KỸ THUẬT PHỤ TRÁCH (Trường chốt 11/09) — cơ sở ở xa như Huế thì thực tế
       chỉ một người đi được, chọn tên ở đây là phiếu của cơ sở đó tự gắn tên
       người ấy và bắn thông báo đích danh ngay khi CHT bấm gửi.
       Để trống = cơ sở chạy như cũ: cả team thấy, ai rảnh tự nhận.
       ============================================================ */
    '<div class="qlNhomD">KỸ THUẬT PHỤ TRÁCH</div>' +
    '<div class="qlChon"><select data-ptcs="' + esc(id) + '">' +
    '<option value="">— Không đặt · cả team tự nhận —</option>' +
    dsTho().map(t => '<option value="' + esc(t.ten) + '"' +
      (c.ktPhuTrach === t.ten ? ' selected' : '') + '>' + esc(t.ten) + '</option>').join('') +
    '</select>' +
    '<div class="s">' + (c.ktPhuTrach
      ? 'Lỗi của cơ sở này tự gắn tên <b>' + esc(c.ktPhuTrach) + '</b> và báo riêng cho anh ấy. ' +
        'Vẫn phải bấm nhận + chọn ngày xong, và người khác vẫn nhận thay được.'
      : 'Đang để trống: cả team kỹ thuật cùng thấy, ai rảnh tự nhận.') + '</div></div>' +
    '<button class="mn" data-qlxoa="coso" data-id="' + esc(id) + '"><div class="ic" style="background:#FEE2E2;color:#B91C1C">✕</div>' +
    '<div><b>Xoá cơ sở này</b><div class="s">hỏi lại trước khi xoá</div></div><span class="mui">›</span></button>' +
    '<div class="qlNhomD">GIAN HÀNG · ' + gh.length + '</div>' +
    '<button class="mn" data-qlthem="gianhang" data-id="' + esc(id) + '"><div class="ic" style="background:#DCFCE7;color:#15803D">＋</div>' +
    '<div><b>Thêm gian hàng vào cơ sở này</b><div class="s">chỉ cần đặt tên</div></div><span class="mui">›</span></button>' +
    dsGh,
    '<button class="btn v" data-qlve="goc">‹ Quay lại</button>' +
    '<button class="btn v" style="flex:1" data-dongsheet="1">Đóng</button>'));
  qlTraCuon('cs:' + id);
}
function veLaiQL() {
  const el = document.getElementById('qlNoi');
  if (el) el.innerHTML = veQL();
  doQLRong();                    /* vẽ lại thì đo lại — không là mất lớp .rong */
}

/* ============================================================
   MÀN CƠ SỞ HAI CỘT (16/10 — Trường gửi ảnh mẫu).
   Trước đây: danh sách dọc, bấm một cơ sở thì MỞ MÀN KHÁC đè lên, muốn xem
   cơ sở kế bên phải bấm Trở lại rồi bấm tiếp. Giờ danh sách bên trái đứng
   yên, chi tiết đổi bên phải — so hai cơ sở chỉ mất một cú bấm.

   ĐIỆN THOẠI ĐI HAI BƯỚC: màn hẹp thì hai cột xếp dọc thành 2,4 màn cuộn
   (đo thật). Nên trên điện thoại chỉ hiện MỘT bên: chưa chọn thì thấy danh
   sách, chọn rồi thì thấy chi tiết kèm nút ‹ quay lại. Máy tính vẫn hai cột.

   Gian hàng và nhân sự chuyển thành TAB trong cột phải — trước phải bấm vào
   từng lớp mới thấy.
   ============================================================ */
let QL_CS = '';            /* mã cơ sở đang chọn */
let QL_CS_TAB = 'tin';     /* tin | gian | nguoi */

/* Chữ trong ô vuông trước tên cơ sở (19/10).
   Trước lấy chữ cái đầu của tên, mà 5 cơ sở Aeon thì ra 5 ô chữ "A" y hệt
   nhau — nhìn một cột toàn A, không phân biệt nổi cái nào với cái nào.
   Giờ lấy số trong mã: CS04 → "04". Mã nào không có số thì lùi về hai chữ
   cái đầu của tên, vẫn hơn một chữ. */
function chuCoSo(c) {
  const so = String(c && c.id || '').match(/(\d+)\s*$/);
  if (so) return so[1].slice(-2);
  return String(c && c.ten || '?').trim().slice(0, 2).toUpperCase();
}

/* Mã người dùng rút gọn khi đem ra hiện (19/10).
   Hầu hết mã ngắn gọn kiểu tho_luc, cs_CS02. Riêng vài tài khoản lập bằng
   đường khác mang mã dài 40 ký tự — ktu_c8bd6b36-bc2d-421d-8a47-70f157edc41b
   của Hoàng Văn Tuân chẳng hạn — hiện nguyên thì tràn hai dòng, đè cả dòng
   dưới. Mã đầy đủ vẫn nằm trong title, rê vào là thấy đủ; đây chỉ là chuyện
   hiển thị, không đụng tới dữ liệu. */
function maGon(id) {
  const s = String(id || '');
  return s.length <= 18 ? s : s.slice(0, 11) + '…' + s.slice(-4);
}

function veQLCoSo() {
  const cs = D.cosos || [];
  if (!cs.length) return '<div class="tkRong">Chưa có cơ sở nào.</div>';
  /* ============================================================
     LỖI ĐÃ MẮC (16/10) — Trường chụp màn iPhone: mở Quản lý ra là nhảy
     THẲNG vào cơ sở đầu tiên, danh sách 14 cơ sở biến mất.
     Vì bản đầu em gán luôn QL_CS = cs[0].id, mà lớp .daChon lại bám vào
     "QL_CS có giá trị hay không" — nên lúc nào cũng coi như đã chọn, điện
     thoại lập tức lật sang bước 2.
     Giờ tách hẳn hai thứ:
       · QL_CS    = người dùng THẬT SỰ bấm chọn. Rỗng = chưa chọn.
       · chonHien = cơ sở đang vẽ ở cột phải. Chưa chọn thì lấy tạm cái đầu
                    để máy tính không có một cột trống hoác.
     Máy tính thấy cả hai cột ngay từ đầu; điện thoại thấy danh sách trước,
     bấm vào mới sang chi tiết.
     ============================================================ */
  if (QL_CS && !cs.some(c => c.id === QL_CS)) QL_CS = '';   /* cơ sở vừa bị xoá */
  const chon = cs.find(c => c.id === QL_CS) || cs[0];
  const demGh = id => (D.gianhangs || []).filter(g => g.coSoId === id).length;
  const demNg = id => (D.ai || []).filter(a => a && a.coSoId === id).length;
  const demPh = id => (D.phieu || []).filter(p => p.coSoId === id && p.trangThai !== 'huy').length;

  const dsHtml = cs.map(c =>
    '<button class="qlO' + (c.id === chon.id ? ' on' : '') + '" data-qlcs="' + esc(c.id) + '">' +
      '<span class="qlOAnh">' + esc(chuCoSo(c)) + '</span>' +
      '<span class="qlOChu"><b>' + esc(c.ten) + '</b>' +
        '<span class="ma">' + esc(c.id) + '</span>' +
        '<span class="so"><span>' + demGh(c.id) + ' gian hàng</span>' +
        '<span>' + demNg(c.id) + ' người</span></span></span>' +
      '<span class="qlMui">›</span></button>').join('');

  const ghCua = (D.gianhangs || []).filter(g => g.coSoId === chon.id);
  const ngCua = (D.ai || []).filter(a => a && a.coSoId === chon.id);
  const cht = ngCua.filter(a => a.vai === 'coso');

  let noiDung = '';
  if (QL_CS_TAB === 'gian') {
    noiDung = '<button class="mn" data-qlthem="gianhang"><div class="ic" style="background:#DCFCE7">' +
      '<img width="22" height="22" class="mnIc" src="ic/tab-chiaviec.webp" alt="" loading="lazy"></div>' +
      '<div><b>Thêm gian hàng</b><div class="s">cho ' + esc(chon.ten) + '</div></div>' +
      '<span class="mui">›</span></button>' +
      (ghCua.length ? ghCua.map(g => {
        const sl = (D.phieu || []).filter(p => p.gianHangId === g.id && p.trangThai !== 'huy').length;
        return '<div class="qlDong"><b>' + esc(g.ten) + '</b>' +
          '<div class="s">' + esc(g.id) + (sl ? ' · ' + sl + ' phiếu' : ' · chưa có phiếu nào') + '</div>' +
          '<button class="qlSua" data-qlsua="gianhang" data-id="' + esc(g.id) + '">Sửa tên</button>' +
          '<button class="qlXoa" data-qlxoa="gianhang" data-id="' + esc(g.id) + '">Xoá</button></div>';
      }).join('') : '<div class="tkRong">Cơ sở này chưa có gian hàng nào.</div>');
  } else if (QL_CS_TAB === 'nguoi') {
    noiDung = ngCua.length ? ngCua.map(a =>
      '<div class="qlDong"><b><span class="thoTron" style="background:' + esc(a.mau) +
      ';display:inline-grid;vertical-align:-5px;margin-right:6px">' +
      esc((a.ten || '?').trim().slice(0, 1)) + '</span>' + esc(a.ten) + '</b>' +
      '<div class="s" title="' + esc(a.id) + '">' + esc(maGon(a.id)) + ' · ' +
      ({ tho: 'kỹ thuật', coso: 'cơ sở / CHT', quanly: 'quản lý' }[a.vai] || '') + '</div>' +
      '<button class="qlSua" data-qlsua="nguoi" data-id="' + esc(a.id) + '">Sửa</button></div>').join('')
      : '<div class="tkRong">Chưa ai gắn với cơ sở này.</div>';
  } else {
    noiDung = '<div class="qlLuoi">' +
      '<div class="qlTruong"><label>Tên cơ sở</label>' +
        '<input value="' + esc(chon.ten) + '" readonly></div>' +
      '<div class="qlTruong"><label>Mã cơ sở</label>' +
        '<input value="' + esc(chon.id) + '" readonly></div>' +
      '<div class="qlTruong"><label>Kỹ thuật phụ trách</label>' +
        '<input value="' + esc(chon.ktPhuTrach || 'chưa gán') + '" readonly></div>' +
      '<div class="qlTruong"><label>CHT phụ trách</label>' +
        '<input value="' + esc(cht.length ? cht.map(x => x.ten).join(', ') : 'chưa có') + '" readonly></div>' +
      '</div>' +
      '<div class="qlNut">' +
        '<button class="btn v" data-qlsua="coso" data-id="' + esc(chon.id) + '">Sửa tên cơ sở</button>' +
        /* ô chọn kỹ thuật phụ trách: dùng lại đúng data-ptcs có sẵn, không
           dựng cơ chế mới — bộ bắt sự kiện không phải sửa dòng nào */
        '</div><div class="qlChon"><label>Kỹ thuật phụ trách</label>' +
        '<select data-ptcs="' + esc(chon.id) + '">' +
        '<option value="">— chưa gán —</option>' +
        dsTho().map(t => '<option value="' + esc(t.ten) + '"' +
          (chon.ktPhuTrach === t.ten ? ' selected' : '') + '>' + esc(t.ten) + '</option>').join('') +
        '</select></div><div class="qlNut">' +
        '<button class="btn v qlNutXoa" data-qlxoa="coso" data-id="' + esc(chon.id) + '">Xoá cơ sở</button>' +
      '</div>';
  }

  const tab = (k, t) => '<button data-qlcstab="' + k + '" class="' + (QL_CS_TAB === k ? 'on' : '') + '">' + t + '</button>';
  return '<div class="qlHai' + (QL_CS ? ' daChon' : '') + '">' +
    '<div class="qlCot qlBenTrai">' +
      '<div class="qlCotDau"><b>Danh sách cơ sở</b><i>Tổng ' + cs.length + ' cơ sở</i></div>' +
      '<div class="qlDs">' + dsHtml + '</div>' +
      '<button class="mn qlThem" data-qlthem="coso"><div class="ic" style="background:#E0F2FE">' +
        '<img width="22" height="22" class="mnIc" src="ic/av-thumuc.webp" alt="" loading="lazy"></div>' +
        '<div><b>Thêm cơ sở mới</b><div class="s">mã + tên, dùng ngay được</div></div>' +
        '<span class="mui">›</span></button>' +
    '</div>' +
    '<div class="qlCot qlBenPhai">' +
      '<div class="qlCtDau">' +
        '<button class="qlVeDs" data-qlveds="1" title="Quay lại danh sách">‹</button>' +
        '<span class="qlCtAnh">' + esc(chuCoSo(chon)) + '</span>' +
        '<div><div class="qlCtTen">' + esc(chon.ten) + '</div>' +
        '<div class="qlCtPhu">' + esc(chon.id) + '</div>' +
        '<div class="qlCtSo"><span>' + demGh(chon.id) + ' gian hàng</span>' +
        '<span>' + demNg(chon.id) + ' người</span><span>' + demPh(chon.id) + ' phiếu</span></div></div>' +
      '</div>' +
      '<div class="qlTab2">' + tab('tin', 'Thông tin chung') +
        tab('gian', 'Gian hàng (' + ghCua.length + ')') +
        tab('nguoi', 'Nhân sự (' + ngCua.length + ')') + '</div>' +
      '<div class="qlND">' + noiDung + '</div>' +
    '</div></div>';
}

function veQL() {
  if (QL_TAB === 'coso') return veQLCoSo();
  if (QL_TAB === 'gianhangCu') {
    return '<button class="mn" data-qlthem="gianhang"><div class="ic" style="background:#DCFCE7;color:#15803D">＋</div>' +
      '<div><b>Thêm gian hàng</b><div class="s">chọn cơ sở rồi đặt tên</div></div><span class="mui">›</span></button>' +
      D.cosos.map(c => {
        const gh = D.gianhangs.filter(g => g.coSoId === c.id);
        if (!gh.length) return '';
        return '<div class="qlNhom">' + esc(c.ten) + '</div>' + gh.map(g => {
          const sl = D.phieu.filter(p => p.gianHangId === g.id && p.trangThai !== 'huy').length;
          return '<div class="qlDong"><b>' + esc(g.ten) + '</b>' +
            '<div class="s">' + esc(g.id) + (sl ? ' · ' + sl + ' phiếu' : ' · chưa có phiếu nào') + '</div>' +
            '<button class="qlSua" data-qlsua="gianhang" data-id="' + esc(g.id) + '">Sửa tên</button>' +
            '<button class="qlXoa" data-qlxoa="gianhang" data-id="' + esc(g.id) + '">Xoá</button></div>';
        }).join('');
      }).join('');
  }
  const nhom = [['tho', 'KỸ THUẬT'], ['coso', 'CƠ SỞ / CHT'], ['quanly', 'QUẢN LÝ']];
  return '<button class="mn" data-qlthem="nguoi"><div class="ic" style="background:#EDE9FE;color:#6D28D9">＋</div>' +
    '<div><b>Thêm người vào web</b><div class="s">kỹ thuật mới, CHT mới — không cần mật khẩu</div></div><span class="mui">›</span></button>' +
    nhom.map(([v, ten]) => {
      const ds = D.ai.filter(a => a.vai === v);
      if (!ds.length) return '';
      return '<div class="qlNhom">' + ten + ' · ' + ds.length + '</div>' + ds.map(a =>
        '<div class="qlDong"><b><span class="thoTron" style="background:' + esc(a.mau) + ';display:inline-grid;vertical-align:-5px;margin-right:6px">' +
        esc((a.ten || '?').trim().slice(0, 1)) + '</span>' + esc(a.ten) + '</b>' +
        '<div class="s" title="' + esc(a.id) + '">' + esc(maGon(a.id)) + (a.coSoId ? ' · ' + esc(tenCoSo(a.coSoId)) : '') +
        (function () { const n = soViecCua(a); return n ? ' · ' + n + ' việc chưa xong' : ''; })() + '</div>' +
        '<button class="qlSua" data-qlsua="nguoi" data-id="' + esc(a.id) + '">Sửa</button>' +
        '<button class="qlAn" data-qlan="' + esc(a.id) + '">Ẩn</button>' +
        '<button class="qlXoa" data-qlxoa="nguoi" data-id="' + esc(a.id) + '">Xoá</button></div>').join('');
    }).join('') +
    /* ĐÃ ẨN — trước đây ẩn nhầm là hết đường lấy lại trong web (08/09) */
    ((D.aiAn || []).length
      ? '<div class="qlNhom">ĐÃ ẨN · ' + D.aiAn.length + ' — bấm để hiện lại</div>' +
        D.aiAn.map(a => '<div class="qlDong mo"><b>' + esc(a.ten) + '</b>' +
          '<div class="s">' + esc(a.id) + ' · ' + ({ tho: 'kỹ thuật', coso: 'cơ sở', quanly: 'quản lý' }[a.vai] || '') +
          ' · phiếu và tin cũ vẫn giữ</div>' +
          '<button class="qlHien" data-qlhien="' + esc(a.id) + '">Hiện lại</button>' +
          '<button class="qlXoa" data-qlxoa="nguoi" data-id="' + esc(a.id) + '">Xoá</button></div>').join('')
      : '');
}

/* việc chưa xong đang dính vào một người — để cảnh báo trước khi ẩn/xoá */
function soViecCua(a) {
  if (!a) return 0;
  if (a.vai === 'tho') return D.phieu.filter(p => !['nghiemthu', 'huy'].includes(p.trangThai) &&
    (p.nguoiNhanKt === a.ten || (p.nguoiSua || []).includes(a.ten))).length;
  if (a.vai === 'coso') return D.phieu.filter(p => p.coSoId === a.coSoId &&
    !['nghiemthu', 'huy'].includes(p.trangThai)).length;
  return 0;
}

/* ---------- thêm / sửa ---------- */
function formQLThem(loai, csGan) {
  qlGhiCuon();
  if (loai === 'coso') {
    moSheet(khungSheet(qlNutLui('goc') + 'Thêm cơ sở', 'Mã ngắn, không dấu — dùng làm khoá trong kho dữ liệu',
      '<div class="f"><label>MÃ CƠ SỞ <i>*</i></label><input class="ip" id="q_ma" placeholder="VD: FZIPH" style="text-transform:uppercase"></div>' +
      '<div class="f"><label>TÊN CƠ SỞ <i>*</i></label><input class="ip" id="q_ten" placeholder="VD: FZ IPH"></div>',
      '<button class="btn v" data-qlve="goc">‹ Quay lại</button><button class="btn pri" id="q_luuCS">Thêm cơ sở</button>'));
  } else if (loai === 'gianhang') {
    /* mở từ trong một cơ sở thì khoá sẵn cơ sở đó, khỏi phải chọn lại (08/09) */
    const csId = csGan || (QL_VE.indexOf('cs:') === 0 ? QL_VE.slice(3) : (D.cosos[0] || {}).id);
    const ve = 'cs:' + csId;
    moSheet(khungSheet(qlNutLui(ve) + 'Thêm gian hàng', 'vào cơ sở ' + esc(tenCoSo(csId)),
      '<input type="hidden" id="q_cs" value="' + esc(csId) + '">' +
      '<div class="f"><label>TÊN GIAN HÀNG <i>*</i></label><input class="ip" id="q_ten" placeholder="VD: Funzone tầng 2"></div>',
      '<button class="btn v" data-qlve="' + esc(ve) + '">‹ Quay lại</button><button class="btn pri" id="q_luuGH">Thêm gian hàng</button>'));
  } else {
    moSheet(khungSheet(qlNutLui('goc') + 'Thêm người vào web', 'Không mật khẩu — người này bấm tên mình để vào',
      '<div class="f"><label>VAI <i>*</i></label><div class="mucdo3" id="q_vai">' +
      '<button data-qvai="tho" class="on" style="color:#0E7490;background:#ECFEFF">Kỹ thuật</button>' +
      '<button data-qvai="coso">Cơ sở / CHT</button>' +
      '<button data-qvai="quanly">Quản lý</button></div></div>' +
      '<div class="f"><label>TÊN HIỆN TRÊN NÚT <i>*</i></label><input class="ip" id="q_ten" placeholder="VD: Lã Xuân Mạnh (FZ IPH)"></div>' +
      '<div class="f" id="q_csBox" style="display:none"><label>PHỤ TRÁCH CƠ SỞ <i>*</i></label><select class="ip" id="q_cs">' +
      D.cosos.map(c => '<option value="' + esc(c.id) + '">' + esc(c.ten) + '</option>').join('') + '</select></div>',
      '<button class="btn v" data-qlve="goc">‹ Quay lại</button><button class="btn pri" id="q_luuNG">Thêm người</button>'));
  }
}
function formQLSua(loai, id) {
  qlGhiCuon();
  if (loai === 'nguoi') return formQLSuaNguoi(id);
  const ten = loai === 'coso' ? tenCoSo(id) : tenGianHang(id);
  /* sửa gian hàng thì lùi về cơ sở của nó; sửa cơ sở thì lùi về màn cơ sở đó */
  const ve = loai === 'coso' ? ('cs:' + id)
    : ('cs:' + ((D.gianhangs.find(g => g.id === id) || {}).coSoId || ''));
  moSheet(khungSheet(qlNutLui(ve) + (loai === 'coso' ? 'Sửa tên cơ sở' : 'Sửa tên gian hàng'), esc(id),
    '<div class="f"><label>TÊN MỚI <i>*</i></label><input class="ip" id="q_ten" value="' + esc(ten) + '"></div>',
    '<button class="btn v" data-qlve="' + esc(ve) + '">‹ Quay lại</button>' +
    '<button class="btn pri" id="q_luuSua" data-loai="' + loai + '" data-id="' + esc(id) + '" data-ve="' + esc(ve) + '">Lưu tên mới</button>'));
}

/* SỬA NGƯỜI (Trường chốt 08/09): trước chỉ sửa được tên nên CHT chuyển cơ sở
   hay kỹ thuật lên quản lý đều phải tạo người mới. Giờ đổi được cả vai và cơ sở. */
function formQLSuaNguoi(id) {
  qlGhiCuon();
  const a = (D.ai.find(x => x.id === id)) || ((D.aiAn || []).find(x => x.id === id)) || {};
  const nut = (v, ten) => '<button data-qvai="' + v + '"' +
    (a.vai === v ? ' class="on" style="color:#0E7490;background:#ECFEFF"' : '') + '>' + ten + '</button>';
  moSheet(khungSheet(qlNutLui('goc') + 'Sửa người', esc(id) + ' · đổi tên, vai, cơ sở phụ trách',
    '<div class="f"><label>TÊN HIỆN TRÊN NÚT <i>*</i></label><input class="ip" id="q_ten" value="' + esc(a.ten || '') + '"></div>' +
    '<div class="f"><label>VAI <i>*</i></label><div class="mucdo3" id="q_vai">' +
    nut('tho', 'Kỹ thuật') + nut('coso', 'Cơ sở / CHT') + nut('quanly', 'Quản lý') + '</div></div>' +
    '<div class="f" id="q_csBox"' + (a.vai === 'coso' ? '' : ' style="display:none"') + '><label>PHỤ TRÁCH CƠ SỞ <i>*</i></label><select class="ip" id="q_cs">' +
    D.cosos.map(c => '<option value="' + esc(c.id) + '"' + (a.coSoId === c.id ? ' selected' : '') + '>' + esc(c.ten) + '</option>').join('') +
    '</select></div>' +
    '<div class="qlNhac">Đổi vai là đổi luôn quyền của người đó ngay lần mở web sau. Phiếu và tin cũ vẫn ghi tên như trước.</div>',
    '<button class="btn v" data-qlve="goc">‹ Quay lại</button><button class="btn pri" id="q_luuSua" data-loai="nguoi" data-id="' + esc(id) + '" data-ve="goc">Lưu</button>'));
}

/* ============================================================
   XOÁ CÓ HỎI LẠI (Trường chốt 08/09: "muốn xóa được và hỏi xác nhận trước")
   Nói thẳng cái gì mất, cái gì giữ, rồi bắt gõ chữ XOA — không có nút xoá
   một-phát-là-mất. Phiếu và tin nhắn KHÔNG bao giờ bị xoá theo.
   ============================================================ */
function formQLXoa(loai, id) {
  qlGhiCuon();
  let tieu = '', ten = '', mat = [], giu = [], anDuoc = '';
  /* xoá gian hàng thì lùi về cơ sở của nó; xoá cơ sở / người thì về màn gốc */
  const veXoa = loai === 'gianhang'
    ? ('cs:' + ((D.gianhangs.find(g => g.id === id) || {}).coSoId || ''))
    : (loai === 'coso' ? ('cs:' + id) : 'goc');
  if (loai === 'coso') {
    ten = tenCoSo(id); tieu = 'Xoá cơ sở';
    const gh = D.gianhangs.filter(g => g.coSoId === id);
    const pl = D.phieu.filter(p => p.coSoId === id && p.trangThai !== 'huy');
    const cho = pl.filter(p => !['nghiemthu'].includes(p.trangThai));
    const ng = (D.ai || []).concat(D.aiAn || []).filter(a => a.coSoId === id);
    mat.push('Cơ sở <b>' + esc(ten) + '</b> biến khỏi mọi ô chọn và ô lọc');
    if (gh.length) mat.push('<b>' + gh.length + ' gian hàng</b> của cơ sở này vẫn nằm trong kho nhưng không còn cơ sở mẹ — nên xoá chúng trước');
    if (ng.length) mat.push('<b>' + ng.length + ' người</b> đang phụ trách cơ sở này sẽ không còn cơ sở — vào Sửa người đổi lại cơ sở cho họ');
    if (pl.length) giu.push('<b>' + pl.length + ' phiếu</b> cũ giữ nguyên, nhưng cột Cơ sở sẽ hiện <b>—</b>' + (cho.length ? ' (trong đó <b>' + cho.length + ' việc chưa xong</b>)' : ''));
  } else if (loai === 'gianhang') {
    ten = tenGianHang(id); tieu = 'Xoá gian hàng';
    const pl = D.phieu.filter(p => p.gianHangId === id && p.trangThai !== 'huy');
    const cho = pl.filter(p => !['nghiemthu'].includes(p.trangThai));
    mat.push('Gian hàng <b>' + esc(ten) + '</b> biến khỏi ô chọn khi cơ sở báo lỗi');
    mat.push('Mất luôn <b>lý lịch gian hàng</b> — hết tra được máy này hỏng mấy lần');
    if (pl.length) giu.push('<b>' + pl.length + ' phiếu</b> cũ giữ nguyên, nhưng cột Gian hàng sẽ hiện <b>—</b>' + (cho.length ? ' (trong đó <b>' + cho.length + ' việc chưa xong</b>)' : ''));
  } else {
    const a = (D.ai.find(x => x.id === id)) || ((D.aiAn || []).find(x => x.id === id)) || {};
    ten = a.ten || id; tieu = 'Xoá người';
    const n = soViecCua(a);
    mat.push('<b>' + esc(ten) + '</b> biến khỏi màn "Bạn là ai?" và mọi ô chọn người');
    mat.push('Link riêng của người này <b>hết dùng được</b>');
    if (n) mat.push('Đang có <b>' + n + ' việc chưa xong</b> dính tên người này');
    giu.push('Phiếu, tin nhắn, ảnh người này từng gửi <b>vẫn còn nguyên</b> và vẫn ghi tên');
    anDuoc = 'Biến khỏi danh sách chọn người, nhưng lấy lại được bất cứ lúc nào';
  }
  moSheet(khungSheet(qlNutLui(veXoa) + '⚠ ' + tieu + ': ' + esc(ten), 'Việc này KHÔNG lấy lại được',
    '<div class="qlMat"><b>MẤT ĐI</b><ul>' + mat.map(x => '<li>' + x + '</li>').join('') + '</ul></div>' +
    (giu.length ? '<div class="qlGiu"><b>GIỮ NGUYÊN</b><ul>' + giu.map(x => '<li>' + x + '</li>').join('') + '</ul></div>' : '') +
    '<div class="f"><label>GÕ CHỮ <b>XOA</b> ĐỂ XÁC NHẬN</label><input class="ip" id="q_xn" placeholder="XOA" style="text-transform:uppercase"></div>' +
    (anDuoc ? '<button class="mn" data-qlan="' + esc(id) + '"><div class="ic" style="background:#FEF3C7;color:#B45309"><img width="22" height="22" class="mnIc" src="ic/tab-radar.webp" alt="" loading="lazy"></div><div><b>Ẩn thay vì xoá</b><div class="s">' + anDuoc + '</div></div><span class="mui">›</span></button>' : ''),
    '<button class="btn v" data-qlve="' + esc(veXoa) + '">‹ Thôi</button>' +
    '<button class="btn do" id="q_xoaOk" data-loai="' + loai + '" data-id="' + esc(id) + '" style="flex:1">Xoá hẳn</button>'));
}

/* ---------- ghi ---------- */
async function qlThemCoSo() {
  const ma = (document.getElementById('q_ma').value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const ten = (document.getElementById('q_ten').value || '').trim();
  if (!ma || !ten) { nhac('Điền cả mã và tên', 'do'); return; }
  if (D.cosos.some(c => c.id === ma)) { nhac('Mã này đã có', 'do'); return; }
  await ghi('co_so', 'insert', { id: ma, ten: ten, trang_thai: 'hoatdong' });
  await ghi('kt_nguoi', 'insert', { id: 'cs_' + ma, ten: ten, vai: 'coso', co_so_id: ma, mau: '#BE185D', thu_tu: 20, hien: true });
  D.cosos.push({ id: ma, ten: ten });
  D.ai.push({ id: 'cs_' + ma, ten: ten, vai: 'coso', coSoId: ma, mau: '#BE185D', thuTu: 20 });
  luuCache(); QL_TAB = 'coso'; formQLCoSo(ma); veHet();
  nhac('Đã thêm cơ sở ' + ten, 'la');
}
async function qlThemGianHang() {
  const cs = document.getElementById('q_cs').value;
  const ten = (document.getElementById('q_ten').value || '').trim();
  if (!ten) { nhac('Chưa điền tên gian hàng', 'do'); return; }
  const id = cs + '-' + String(D.gianhangs.filter(g => g.coSoId === cs).length + 1).padStart(2, '0');
  await ghi('gian_hang', 'insert', { id: id, co_so_id: cs, ten: ten });
  D.gianhangs.push({ id: id, coSoId: cs, ten: ten });
  luuCache(); formQLCoSo(cs);
  nhac('Đã thêm gian hàng ' + ten, 'la');
}
async function qlThemNguoi() {
  const vai = (document.querySelector('#q_vai .on') || {}).dataset.qvai || 'tho';
  const ten = (document.getElementById('q_ten').value || '').trim();
  if (!ten) { nhac('Chưa điền tên', 'do'); return; }
  const cs = vai === 'coso' ? document.getElementById('q_cs').value : null;
  const mau = vai === 'tho' ? '#0F766E' : (vai === 'coso' ? '#BE185D' : '#0E7490');
  const id = vai + '_' + Date.now().toString(36);
  await ghi('kt_nguoi', 'insert', { id: id, ten: ten, vai: vai, co_so_id: cs, mau: mau, thu_tu: 30, hien: true });
  D.ai.push({ id: id, ten: ten, vai: vai, coSoId: cs, mau: mau, thuTu: 30 });
  luuCache(); QL_TAB = 'nguoi'; formQuanLy();
  nhac('Đã thêm ' + ten, 'la');
}
/* ============================================================
   ĐẶT / BỎ KỸ THUẬT PHỤ TRÁCH MỘT CƠ SỞ (11/09).
   Chỉ đổi phiếu LÀM SAU ĐÓ — phiếu cũ giữ nguyên người đang lo, không giật
   việc khỏi tay ai giữa chừng.
   ============================================================ */
async function datKtPhuTrach(coSoId, ten) {
  const c = (D.cosos || []).find(x => x.id === coSoId);
  if (!c) return;
  const cu = c.ktPhuTrach || '';
  try {
    await ghi('co_so', 'update', { kt_phu_trach: ten || null }, coSoId);
    c.ktPhuTrach = ten || '';
    luuCache();
    nhac(ten
      ? 'Lỗi của ' + c.ten + ' từ nay báo thẳng cho ' + ten
      : 'Đã bỏ — lỗi của ' + c.ten + ' quay lại cả team tự nhận', 'la');
    formQLCoSo(coSoId);
  } catch (e) {
    c.ktPhuTrach = cu;
    nhac('Chưa lưu được: ' + ((e && e.message) || ''), 'do');
    formQLCoSo(coSoId);
  }
}

async function qlLuuSua(loai, id, ve) {
  const ten = (document.getElementById('q_ten').value || '').trim();
  if (!ten) { nhac('Chưa điền tên', 'do'); return; }
  const veSau = () => { if (ve) qlVeMan(ve); else formQuanLy(); };
  if (loai === 'nguoi') {
    const vai = (document.querySelector('#q_vai .on') || {}).dataset.qvai || 'tho';
    const cs = vai === 'coso' ? (document.getElementById('q_cs') || {}).value || null : null;
    if (vai === 'coso' && !cs) { nhac('Vai cơ sở phải chọn cơ sở phụ trách', 'do'); return; }
    await ghi('kt_nguoi', 'update', { ten: ten, vai: vai, co_so_id: cs }, id);
    const a = D.ai.find(x => x.id === id) || (D.aiAn || []).find(x => x.id === id);
    if (a) { a.ten = ten; a.vai = vai; a.coSoId = cs; }
    if (D.nguoi && D.nguoi.id === id) datNguoi(Object.assign({}, D.nguoi, { ten: ten, vai: vai, coSoId: cs }));
    luuCache(); QL_TAB = 'nguoi'; veSau(); veHet();
    nhac('Đã lưu — ' + ten + ' giờ là ' + ({ tho: 'kỹ thuật', coso: 'cơ sở / CHT', quanly: 'quản lý' }[vai]), 'la');
    return;
  }
  if (loai === 'coso') {
    await ghi('co_so', 'update', { ten: ten }, id);
    const c = D.cosos.find(x => x.id === id); if (c) c.ten = ten;
  } else if (loai === 'gianhang') {
    await ghi('gian_hang', 'update', { ten: ten }, id);
    const g = D.gianhangs.find(x => x.id === id); if (g) g.ten = ten;
  } else {
    await ghi('kt_nguoi', 'update', { ten: ten }, id);
    const a = D.ai.find(x => x.id === id); if (a) a.ten = ten;
    if (D.nguoi && D.nguoi.id === id) datNguoi(Object.assign({}, D.nguoi, { ten: ten }));
  }
  luuCache(); veSau(); veHet();
  nhac('Đã lưu tên mới', 'la');
}
/* XOÁ HẲN — đã qua màn hỏi lại và gõ chữ XOA */
async function qlXoa(loai, id) {
  const xn = ((document.getElementById('q_xn') || {}).value || '').trim().toUpperCase();
  if (xn !== 'XOA') { nhac('Gõ đúng chữ XOA để xác nhận', 'do'); return; }
  const bang = loai === 'coso' ? 'co_so' : (loai === 'gianhang' ? 'gian_hang' : 'kt_nguoi');
  const csCu = loai === 'gianhang' ? ((D.gianhangs.find(g => g.id === id) || {}).coSoId || '') : '';
  const nut = document.getElementById('q_xoaOk');
  if (nut) { nut.disabled = true; nut.textContent = 'Đang xoá…'; }
  try {
    await xoaDong(bang, id);
    if (loai === 'coso') D.cosos = D.cosos.filter(c => c.id !== id);
    else if (loai === 'gianhang') D.gianhangs = D.gianhangs.filter(g => g.id !== id);
    else {
      D.ai = D.ai.filter(a => a.id !== id);
      D.aiAn = (D.aiAn || []).filter(a => a.id !== id);
      /* xoá đúng người đang dùng máy này → về màn chọn người, khỏi ngồi với tên đã mất */
      if (D.nguoi && D.nguoi.id === id) { dongSheet(); xoaNguoi(); raManVao(); nhac('Đã xoá — chọn lại người dùng máy này', 'canh'); return; }
    }
    luuCache(); veHet();
    if (loai === 'gianhang') { const cs = (D.gianhangs.find(g => g.id === id) || {}).coSoId; qlVeMan(csCu ? 'cs:' + csCu : 'goc'); }
    else formQuanLy();
    nhac('Đã xoá hẳn', 'canh');
  } catch (e) {
    if (nut) { nut.disabled = false; nut.textContent = 'Xoá hẳn'; }
    nhac('Chưa xoá được — ' + (e.message || 'thử lại'), 'do');
  }
}

/* HIỆN LẠI người đã ẩn */
async function qlHienNguoi(id) {
  const a = (D.aiAn || []).find(x => x.id === id); if (!a) return;
  try {
    await ghi('kt_nguoi', 'update', { hien: true }, id);
    a.an = false;
    D.aiAn = (D.aiAn || []).filter(x => x.id !== id);
    D.ai.push(a);
    D.ai.sort((x, y) => (x.thuTu || 99) - (y.thuTu || 99));
    luuCache(); formQuanLy(); veHet();
    nhac('Đã hiện lại ' + a.ten, 'la');
  } catch (e) { nhac('Chưa hiện lại được — ' + (e.message || 'thử lại'), 'do'); }
}

async function qlAnNguoi(id) {
  const a = D.ai.find(x => x.id === id);
  await ghi('kt_nguoi', 'update', { hien: false }, id);
  D.ai = D.ai.filter(x => x.id !== id);
  if (a) { a.an = true; D.aiAn = (D.aiAn || []).concat([a]); }
  luuCache(); QL_TAB = 'nguoi'; formQuanLy(); veHet();
  nhac('Đã ẩn khỏi màn chọn người — lấy lại được ở mục ĐÃ ẨN', 'canh');
}
