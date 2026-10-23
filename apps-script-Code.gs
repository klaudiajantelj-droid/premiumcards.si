// premiumcards.si — order intake (Google Apps Script web app)
// Receives the website order form, saves uploaded files to Google Drive
// and emails the order to order@premiumcards.si. No database.

const ORDER_TO = 'order@premiumcards.si';
const ROOT_FOLDER_NAME = 'premiumcards.si – Bestellungen';
const MAX_ATTACH_BYTES = 18 * 1024 * 1024; // Gmail limit ~25 MB incl. encoding

function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);

    // spam guards (same fields the website already sends)
    // never drop silently: suspicious submissions are still emailed, flagged in the subject
    // (mobile autofill can fill the hidden honeypot field)
    const spamFlags = [];
    if (d.honeypot) spamFlags.push('honeypot');
    if (typeof d.msSincePageLoad === 'number' && d.msSincePageLoad < 3000) spamFlags.push('too fast');
    if (spamFlags.length) console.warn('spam flags: ' + spamFlags.join(', '));
    if (!d.name || !d.email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email)) return json_({ ok: false, error: 'missing fields' });

    // duplicate submissions (double click / retry)
    const cache = CacheService.getScriptCache();
    if (d.requestId && cache.get(d.requestId)) return json_({ ok: true, duplicate: true });

    const stamp = Utilities.formatDate(new Date(), 'Europe/Ljubljana', 'yyyy-MM-dd HH:mm');
    const label = `${stamp} – ${clean_(d.company || d.name)}`;

    // files → Drive folder per order
    const files = Array.isArray(d.files) ? d.files : [];
    let folderUrl = '';
    const blobs = [];
    let attachBytes = 0;
    if (files.length) {
      const folder = rootFolder_().createFolder(label);
      folderUrl = folder.getUrl();
      files.forEach(f => {
        const bytes = Utilities.base64Decode(f.base64 || '');
        const blob = Utilities.newBlob(bytes, f.mimeType || 'application/octet-stream', `${f.kind}_${clean_(f.fileName)}`);
        folder.createFile(blob);
        if (attachBytes + bytes.length <= MAX_ATTACH_BYTES) { blobs.push(blob); attachBytes += bytes.length; }
      });
    }

    const rows = [
      ['Ime / Name', d.name], ['Podjetje', d.company], ['E-pošta', d.email], ['Telefon', d.phone],
      ['ID za DDV', d.vatId], ['Prejšnja št. naročila', d.previousOrderNumber],
      ['Račun – naslov', [d.billingAddress, `${d.billingPostcode || ''} ${d.billingCity || ''}`, d.billingCountry].filter(Boolean).join(', ')],
      ['Dostava', d.shippingSameAsBilling ? 'enako kot račun' :
        [d.shippingAddress, `${d.shippingPostcode || ''} ${d.shippingCity || ''}`, d.shippingCountry].filter(Boolean).join(', ')],
      ['Vrsta naročila', d.orderType], ['Oblikovanje', d.designService], ['Število oseb', d.people],
      ['Skupaj (iz obrazca)', d.clientTotal != null ? d.clientTotal + ' €' : ''],
      ['Brief – podjetje', d.briefCompanyName], ['Brief – panoga', d.briefIndustry], ['Brief – slog', d.briefStyle],
      ['Sporočilo', d.message],
      ['Datoteke', files.length ? `${files.length} – ${folderUrl}` : '—'],
      ['Request ID', d.requestId]
    ].filter(r => r[1] !== undefined && r[1] !== null && r[1] !== '');

    const people = Array.isArray(d.peopleData) ? d.peopleData : [];
    const peopleHtml = people.map((p, i) =>
      `<h3 style="margin:18px 0 6px">Oseba ${i + 1}</h3><table>` +
      Object.keys(p || {}).filter(k => p[k]).map(k => `<tr><td style="color:#777;padding:2px 12px 2px 0">${esc_(k)}</td><td>${esc_(p[k])}</td></tr>`).join('') +
      '</table>').join('');

    const html =
      `<div style="font-family:Arial,sans-serif;font-size:14px;color:#111">
        <h2 style="margin:0 0 12px">Novo povpraševanje – premiumcards.si</h2>
        <table>${rows.map(r => `<tr><td style="color:#777;padding:3px 14px 3px 0;vertical-align:top">${esc_(r[0])}</td><td>${esc_(r[1]).replace(/\n/g, '<br>')}</td></tr>`).join('')}</table>
        ${peopleHtml}
        ${files.length && blobs.length < files.length ? '<p><b>Nekatere datoteke so prevelike za prilogo – vse so v mapi na Google Drive.</b></p>' : ''}
      </div>`;

    MailApp.sendEmail({
      to: ORDER_TO,
      replyTo: d.email,
      name: 'premiumcards.si',
      subject: `${spamFlags.length ? '[SPAM?] ' : ''}Povpraševanje: ${clean_(d.company || d.name)} (${d.people || 1} os.)`,
      htmlBody: html,
      attachments: blobs
    });

    if (d.requestId) cache.put(d.requestId, '1', 21600);
    return json_({ ok: true });
  } catch (err) {
    console.error(err);
    return json_({ ok: false, error: 'server error' });
  }
}

function doGet() { return json_({ ok: true, service: 'premiumcards.si orders' }); }

function rootFolder_() {
  const it = DriveApp.getFoldersByName(ROOT_FOLDER_NAME);
  return it.hasNext() ? it.next() : DriveApp.createFolder(ROOT_FOLDER_NAME);
}
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function esc_(v) { return String(v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function clean_(v) { return String(v || '').replace(/[\\/:*?"<>|\r\n]+/g, ' ').trim().slice(0, 80); }

// Run once manually in the editor to grant Drive + Mail permissions.
function setup() { rootFolder_(); }
