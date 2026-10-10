/**
 * Backup otomatis foto & voice note tamu ke Google Drive.
 *
 * Setup (sekali):
 * 1. Buka https://script.google.com -> New project, hapus isi Code.gs, paste file ini, Save.
 * 2. Pilih fungsi "setup" di toolbar -> Run -> izinkan akses Google Drive.
 *    Folder "Momen Bahagia - Foto Tamu" akan dibuat di Drive Anda.
 * 3. Deploy -> New deployment -> type "Web app"
 *    Execute as: Me | Who has access: Anyone -> Deploy -> salin "Web app URL".
 * 4. Di Vercel: Settings -> Environment Variables -> VITE_GDRIVE_BACKUP_URL = URL tadi, lalu Redeploy.
 *
 * Siapa pun yang tahu URL ini bisa mengirim file, sama seperti upload tamu biasa,
 * jadi script hanya menerima gambar/audio dengan ukuran maksimal 10MB per file.
 */
var FOLDER_NAME = 'Momen Bahagia - Foto Tamu';
var MAX_BYTES = 10 * 1024 * 1024;

function doPost(e) {
  var body = JSON.parse(e.postData.contents);
  var folder = getFolder_();
  var description = String(body.description || '').slice(0, 2000);

  (body.files || []).forEach(function (f) {
    // data:image/webp;base64,...  or  data:audio/webm;codecs=opus;base64,...
    var match = /^data:((image|audio)\/[\w.+-]+)(;[^,]*)?;base64,(.+)$/.exec(String(f.dataUrl || ''));
    if (!match) return;
    var bytes = Utilities.base64Decode(match[4]);
    if (bytes.length > MAX_BYTES) return;
    var ext = match[1].split('/')[1].replace('jpeg', 'jpg');
    var name = String(f.name || 'file').replace(/[\\/:*?"<>|]/g, '_').slice(0, 120) + '.' + ext;
    folder.createFile(Utilities.newBlob(bytes, match[1], name)).setDescription(description);
  });

  return ContentService.createTextOutput('ok');
}

// Run once from the editor so the folder exists before guests upload at the same time
function setup() {
  Logger.log('Folder: ' + getFolder_().getUrl());
}

function getFolder_() {
  var it = DriveApp.getFoldersByName(FOLDER_NAME);
  return it.hasNext() ? it.next() : DriveApp.createFolder(FOLDER_NAME);
}
