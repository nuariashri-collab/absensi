// ====================== KONFIGURASI ======================

const ADMIN_CONFIG = {
  // GANTI dengan URL Web App yang sama dengan yang dipakai script.js
  API_URL: 'https://script.google.com/macros/s/GANTI_DENGAN_DEPLOYMENT_ID/exec'
};

// ====================== STATE ======================

let semuaData = [];
let passwordTersimpan = '';

// ====================== ELEMENT REFERENCES ======================

const ad = {
  loginScreen: document.getElementById('loginScreen'),
  dashboardScreen: document.getElementById('dashboardScreen'),
  inputPassword: document.getElementById('inputPassword'),
  btnLogin: document.getElementById('btnLogin'),
  loginError: document.getElementById('loginError'),
  btnLogout: document.getElementById('btnLogout'),

  sumTepatWaktu: document.getElementById('sumTepatWaktu'),
  sumTerlambat: document.getElementById('sumTerlambat'),
  sumTidakHadir: document.getElementById('sumTidakHadir'),
  sumTotal: document.getElementById('sumTotal'),

  filterTanggalAwal: document.getElementById('filterTanggalAwal'),
  filterTanggalAkhir: document.getElementById('filterTanggalAkhir'),
  filterStatus: document.getElementById('filterStatus'),
  filterJenis: document.getElementById('filterJenis'),
  btnTerapkanFilter: document.getElementById('btnTerapkanFilter'),
  btnResetFilter: document.getElementById('btnResetFilter'),
  btnMuatUlang: document.getElementById('btnMuatUlang'),
  btnExportCsv: document.getElementById('btnExportCsv'),

  tabelBody: document.getElementById('tabelBody'),
  tabelKosong: document.getElementById('tabelKosong'),
  overlayLoadingAdmin: document.getElementById('overlayLoadingAdmin')
};

// ====================== INIT ======================

window.addEventListener('DOMContentLoaded', () => {
  pasangEventListener();

  // Coba pakai password tersimpan di sessionStorage agar tidak perlu login ulang
  // setiap reload dalam satu sesi browser (bukan localStorage agar tidak permanen).
  const sesi = sessionStorage.getItem('adminPassword');
  if (sesi) {
    passwordTersimpan = sesi;
    masukDashboard();
  }
});

function pasangEventListener() {
  ad.btnLogin.addEventListener('click', cobaLogin);
  ad.inputPassword.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') cobaLogin();
  });
  ad.btnLogout.addEventListener('click', keluar);
  ad.btnTerapkanFilter.addEventListener('click', terapkanFilter);
  ad.btnResetFilter.addEventListener('click', resetFilter);
  ad.btnMuatUlang.addEventListener('click', () => muatData(passwordTersimpan));
  ad.btnExportCsv.addEventListener('click', unduhCsv);
}

// ====================== LOGIN ======================

function cobaLogin() {
  const pass = ad.inputPassword.value.trim();
  if (!pass) return;
  passwordTersimpan = pass;
  muatData(pass, true);
}

function masukDashboard() {
  muatData(passwordTersimpan, true);
}

function keluar() {
  sessionStorage.removeItem('adminPassword');
  passwordTersimpan = '';
  ad.inputPassword.value = '';
  ad.dashboardScreen.classList.add('hidden');
  ad.loginScreen.classList.remove('hidden');
}

// ====================== MUAT DATA ======================

async function muatData(password, isLoginAttempt) {
  ad.overlayLoadingAdmin.classList.remove('hidden');
  ad.loginError.classList.add('hidden');

  try {
    const url = ADMIN_CONFIG.API_URL + '?action=admin&password=' + encodeURIComponent(password);
    const response = await fetch(url);
    const hasil = await response.json();

    ad.overlayLoadingAdmin.classList.add('hidden');

    if (!hasil.success) {
      if (isLoginAttempt) {
        ad.loginError.classList.remove('hidden');
      }
      return;
    }

    semuaData = hasil.data || [];
    sessionStorage.setItem('adminPassword', password);

    ad.loginScreen.classList.add('hidden');
    ad.dashboardScreen.classList.remove('hidden');

    renderTabel(semuaData);
    renderRingkasan(semuaData);
  } catch (err) {
    ad.overlayLoadingAdmin.classList.add('hidden');
    if (isLoginAttempt) {
      ad.loginError.textContent = 'Gagal terhubung ke server. Periksa koneksi internet.';
      ad.loginError.classList.remove('hidden');
    }
  }
}

// ====================== FILTER ======================

function terapkanFilter() {
  const awal = ad.filterTanggalAwal.value;
  const akhir = ad.filterTanggalAkhir.value;
  const status = ad.filterStatus.value;
  const jenis = ad.filterJenis.value;

  let hasil = semuaData;

  if (awal) {
    hasil = hasil.filter((row) => row.tanggal >= awal);
  }
  if (akhir) {
    hasil = hasil.filter((row) => row.tanggal <= akhir);
  }
  if (status) {
    hasil = hasil.filter((row) => row.status === status);
  }
  if (jenis) {
    hasil = hasil.filter((row) => row.jenis === jenis);
  }

  renderTabel(hasil);
  renderRingkasan(hasil);
}

function resetFilter() {
  ad.filterTanggalAwal.value = '';
  ad.filterTanggalAkhir.value = '';
  ad.filterStatus.value = '';
  ad.filterJenis.value = '';
  renderTabel(semuaData);
  renderRingkasan(semuaData);
}

// ====================== RENDER ======================

function renderRingkasan(data) {
  const tepatWaktu = data.filter((r) => r.status === 'Tepat Waktu').length;
  const terlambat = data.filter((r) => r.status === 'Terlambat').length;
  const tidakHadir = data.filter((r) => r.status === 'Tidak Hadir').length;

  ad.sumTepatWaktu.textContent = tepatWaktu;
  ad.sumTerlambat.textContent = terlambat;
  ad.sumTidakHadir.textContent = tidakHadir;
  ad.sumTotal.textContent = data.length;
}

function renderTabel(data) {
  ad.tabelBody.innerHTML = '';

  if (data.length === 0) {
    ad.tabelKosong.classList.remove('hidden');
    return;
  }
  ad.tabelKosong.classList.add('hidden');

  data.forEach((row) => {
    const tr = document.createElement('tr');

    tr.appendChild(buatSel(row.tanggal));
    tr.appendChild(buatSel(row.hari));
    tr.appendChild(buatSel(row.jenis));
    tr.appendChild(buatSel(row.jam));
    tr.appendChild(buatSelBadge(row.status));
    tr.appendChild(buatSel(row.menitTerlambat > 0 ? row.menitTerlambat + ' menit' : '-'));
    tr.appendChild(buatSel(row.jamPulangMinimum || '-'));
    tr.appendChild(buatSel(row.lokasi || '-'));
    tr.appendChild(buatSel(row.jarak ? Math.round(row.jarak) + ' m' : '-'));
    tr.appendChild(buatSel(row.akurasiGps ? '±' + Math.round(row.akurasiGps) + ' m' : '-'));
    tr.appendChild(buatSelFoto(row.linkFoto));

    ad.tabelBody.appendChild(tr);
  });
}

function buatSel(teks) {
  const td = document.createElement('td');
  td.textContent = teks;
  return td;
}

function buatSelBadge(status) {
  const td = document.createElement('td');
  if (!status || status === '-') {
    td.textContent = '-';
    return td;
  }
  const span = document.createElement('span');
  span.textContent = status;
  span.className = 'badge ' + (
    status === 'Tepat Waktu' ? 'badge-tepat' :
    status === 'Terlambat' ? 'badge-terlambat' : 'badge-tidakhadir'
  );
  td.appendChild(span);
  return td;
}

function buatSelFoto(link) {
  const td = document.createElement('td');
  if (!link || link === '-') {
    td.textContent = '-';
    return td;
  }
  const a = document.createElement('a');
  a.href = link;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.className = 'link-foto';
  a.textContent = 'Lihat foto';
  td.appendChild(a);
  return td;
}

// ====================== EXPORT CSV ======================

function unduhCsv() {
  if (semuaData.length === 0) return;

  const header = [
    'Tanggal', 'Hari', 'Nama', 'NIK', 'Jenis', 'Jam', 'Status',
    'Menit Terlambat', 'Jam Pulang Minimum', 'Status Jam Kerja',
    'Lokasi', 'Jarak (m)', 'Akurasi GPS (m)', 'Link Foto'
  ];

  const baris = semuaData.map((r) => [
    r.tanggal, r.hari, r.nama, r.nik, r.jenis, r.jam, r.status,
    r.menitTerlambat, r.jamPulangMinimum, r.statusJamKerja,
    r.lokasi, Math.round(r.jarak || 0), Math.round(r.akurasiGps || 0), r.linkFoto
  ]);

  let csv = header.join(',') + '\n';
  baris.forEach((row) => {
    csv += row.map((val) => '"' + String(val).replace(/"/g, '""') + '"').join(',') + '\n';
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'rekap-absensi-' + new Date().toISOString().slice(0, 10) + '.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
