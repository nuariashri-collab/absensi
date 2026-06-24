// ====================== KONFIGURASI ======================

const CONFIG = {
  // GANTI dengan URL Web App hasil deploy Google Apps Script Ari
  API_URL: 'https://script.google.com/macros/s/GANTI_DENGAN_DEPLOYMENT_ID/exec',
  NAMA_PEGAWAI: 'Muhammad Ananda Difa',
  AKURASI_GPS_MAKSIMAL: 100 // meter, harus sama dengan sheet Pengaturan
};

// ====================== STATE ======================

let posisiSekarang = null; // { latitude, longitude, accuracy }
let fotoBase64Sekarang = null;
let streamKamera = null;

// ====================== ELEMENT REFERENCES ======================

const el = {
  statusGpsCard: document.getElementById('statusGpsCard'),
  statusGpsDot: document.getElementById('statusGpsDot'),
  statusGpsText: document.getElementById('statusGpsText'),

  cameraStream: document.getElementById('cameraStream'),
  canvasFoto: document.getElementById('canvasFoto'),
  previewFoto: document.getElementById('previewFoto'),
  placeholderFoto: document.getElementById('placeholderFoto'),

  btnBukaKamera: document.getElementById('btnBukaKamera'),
  btnAmbilFoto: document.getElementById('btnAmbilFoto'),
  btnUlangiFoto: document.getElementById('btnUlangiFoto'),

  btnAbsenDatang: document.getElementById('btnAbsenDatang'),
  btnAbsenPulang: document.getElementById('btnAbsenPulang'),

  overlayLoading: document.getElementById('overlayLoading'),
  loadingText: document.getElementById('loadingText'),

  modalHasil: document.getElementById('modalHasil'),
  modalIcon: document.getElementById('modalIcon'),
  modalMessage: document.getElementById('modalMessage'),
  btnTutupModal: document.getElementById('btnTutupModal')
};

// ====================== INIT ======================

window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('namaPegawai').textContent = CONFIG.NAMA_PEGAWAI;
  mulaiPantauGps();
  pasangEventListener();
});

function pasangEventListener() {
  el.btnBukaKamera.addEventListener('click', bukaKamera);
  el.btnAmbilFoto.addEventListener('click', ambilFoto);
  el.btnUlangiFoto.addEventListener('click', resetKamera);
  el.btnAbsenDatang.addEventListener('click', () => kirimAbsensi('Datang'));
  el.btnAbsenPulang.addEventListener('click', () => kirimAbsensi('Pulang'));
  el.btnTutupModal.addEventListener('click', () => el.modalHasil.classList.add('hidden'));
}

// ====================== GPS ======================

function mulaiPantauGps() {
  if (!navigator.geolocation) {
    setStatusGps(false, 'Perangkat tidak mendukung GPS.');
    return;
  }

  navigator.geolocation.watchPosition(
    (pos) => {
      posisiSekarang = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy
      };

      if (pos.coords.accuracy > CONFIG.AKURASI_GPS_MAKSIMAL) {
        setStatusGps(false, 'Akurasi lokasi tidak mencukupi (±' + Math.round(pos.coords.accuracy) + ' m).');
      } else {
        setStatusGps(true, 'Lokasi terdeteksi (±' + Math.round(pos.coords.accuracy) + ' m).');
      }
      perbaruiTombolAbsen();
    },
    (err) => {
      let pesan = 'Gagal mengambil lokasi.';
      if (err.code === err.PERMISSION_DENIED) {
        pesan = 'Izin lokasi ditolak. Aktifkan izin lokasi di browser.';
      } else if (err.code === err.TIMEOUT) {
        pesan = 'Waktu pengambilan lokasi habis. Coba lagi.';
      }
      setStatusGps(false, pesan);
      perbaruiTombolAbsen();
    },
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
  );
}

function setStatusGps(valid, teks) {
  el.statusGpsText.textContent = teks;
  el.statusGpsCard.classList.toggle('valid', valid);
}

// ====================== KAMERA & SELFIE ======================

async function bukaKamera() {
  try {
    streamKamera = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user' },
      audio: false
    });
    el.cameraStream.srcObject = streamKamera;
    el.cameraStream.classList.remove('hidden');
    el.placeholderFoto.classList.add('hidden');
    el.previewFoto.classList.add('hidden');

    el.btnBukaKamera.classList.add('hidden');
    el.btnAmbilFoto.classList.remove('hidden');
    el.btnUlangiFoto.classList.add('hidden');
  } catch (err) {
    tampilkanModal('gagal', 'Tidak dapat mengakses kamera. Pastikan izin kamera diaktifkan.');
  }
}

function ambilFoto() {
  const video = el.cameraStream;
  const canvas = el.canvasFoto;
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  // Foto disimpan sebagai JPEG kualitas 0.85 untuk efisiensi ukuran
  const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
  fotoBase64Sekarang = dataUrl.split(',')[1];

  el.previewFoto.src = dataUrl;
  el.previewFoto.classList.remove('hidden');
  el.cameraStream.classList.add('hidden');

  hentikanStreamKamera();

  el.btnAmbilFoto.classList.add('hidden');
  el.btnUlangiFoto.classList.remove('hidden');

  perbaruiTombolAbsen();
}

function resetKamera() {
  fotoBase64Sekarang = null;
  el.previewFoto.classList.add('hidden');
  el.placeholderFoto.classList.remove('hidden');
  el.btnUlangiFoto.classList.add('hidden');
  el.btnBukaKamera.classList.remove('hidden');
  perbaruiTombolAbsen();
}

function hentikanStreamKamera() {
  if (streamKamera) {
    streamKamera.getTracks().forEach((track) => track.stop());
    streamKamera = null;
  }
}

// ====================== VALIDASI TOMBOL ======================

function perbaruiTombolAbsen() {
  const siap = posisiSekarang &&
    posisiSekarang.accuracy <= CONFIG.AKURASI_GPS_MAKSIMAL &&
    fotoBase64Sekarang;

  el.btnAbsenDatang.disabled = !siap;
  el.btnAbsenPulang.disabled = !siap;
}

// ====================== KIRIM ABSENSI ======================

async function kirimAbsensi(jenis) {
  if (!posisiSekarang || !fotoBase64Sekarang) {
    tampilkanModal('gagal', 'Lokasi dan foto selfie wajib lengkap sebelum absen.');
    return;
  }

  tampilkanLoading('Mengirim absen ' + jenis.toLowerCase() + '...');

  const payload = {
    jenis: jenis,
    latitude: posisiSekarang.latitude,
    longitude: posisiSekarang.longitude,
    akurasi: posisiSekarang.accuracy,
    fotoBase64: fotoBase64Sekarang
  };

  try {
    const response = await fetch(CONFIG.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload)
    });

    const hasil = await response.json();
    sembunyikanLoading();

    if (hasil.success) {
      tampilkanModal('berhasil', hasil.message);
      resetSetelahAbsen();
    } else {
      tampilkanModal('gagal', hasil.message);
    }
  } catch (err) {
    sembunyikanLoading();
    tampilkanModal('gagal', 'Gagal terhubung ke server. Periksa koneksi internet Anda.');
  }
}

function resetSetelahAbsen() {
  fotoBase64Sekarang = null;
  el.previewFoto.classList.add('hidden');
  el.placeholderFoto.classList.remove('hidden');
  el.btnUlangiFoto.classList.add('hidden');
  el.btnBukaKamera.classList.remove('hidden');
  perbaruiTombolAbsen();
}

// ====================== UI HELPERS ======================

function tampilkanLoading(teks) {
  el.loadingText.textContent = teks;
  el.overlayLoading.classList.remove('hidden');
}

function sembunyikanLoading() {
  el.overlayLoading.classList.add('hidden');
}

function tampilkanModal(tipe, pesan) {
  el.modalIcon.textContent = tipe === 'berhasil' ? '✓' : '✕';
  el.modalIcon.style.color = tipe === 'berhasil' ? '#1D9E75' : '#D04848';
  el.modalMessage.textContent = pesan;
  el.modalHasil.classList.remove('hidden');
}
