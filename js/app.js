const DEMO_PIN = "825491";
const DB_NAME = "ms-photo-select-demo";
const STORE = "photos";
let db;
let photos = [];
let currentPhotoIndex = 0;
let toastTimer;

const $ = (id) => document.getElementById(id);

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE)) database.createObjectStore(STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
function storePhoto(photo) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(photo);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}
function getAllPhotos() {
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE).objectStore(STORE).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
function clearAllPhotos() {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).clear();
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}
function showToast(message) {
  const el = $("toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
}
function switchView(view) {
  $("customerView").hidden = view !== "customer";
  $("adminView").hidden = view !== "admin";
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.toggle("active", b.dataset.view === view));
  if (view === "admin") refreshAdmin();
}
document.querySelectorAll(".nav-btn").forEach(b => b.addEventListener("click", () => switchView(b.dataset.view)));

function makeWatermarkedPreview(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const image = new Image();
      image.onerror = reject;
      image.onload = () => {
        const maxWidth = 1000, maxHeight = 800;
        const scale = Math.min(1, maxWidth / image.width, maxHeight / image.height);
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const ctx = canvas.getContext("2d");
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(-Math.PI / 6);
        ctx.font = `bold ${Math.max(22, Math.round(canvas.width / 14))}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.lineWidth = 2;
        ctx.strokeStyle = "rgba(0,0,0,.35)";
        ctx.fillStyle = "rgba(255,255,255,.48)";
        ctx.strokeText("MS PHOTOGRAPHY", 0, 0);
        ctx.fillText("MS PHOTOGRAPHY", 0, 0);
        ctx.restore();
        canvas.toBlob(blob => {
          if (!blob) return reject(new Error("Could not process image"));
          resolve(blob);
        }, "image/jpeg", 0.28);
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
async function loadPhotos() {
  photos = (await getAllPhotos()).sort((a,b) => a.order - b.order);
  renderGallery();
  refreshAdmin();
}
function selectedPhotos() { return photos.filter(p => p.selected); }
function renderGallery() {
  const grid = $("photoGrid");
  const filter = $("filterSelect").value;
  const visible = photos.filter(p => filter === "all" || (filter === "selected" ? p.selected : !p.selected));
  grid.innerHTML = "";
  $("emptyState").hidden = visible.length !== 0;
  visible.forEach(photo => {
    const card = document.createElement("article");
    card.className = `photo-card${photo.selected ? " is-selected" : ""}`;
    const img = document.createElement("img");
    img.src = photo.preview;
    img.alt = `Preview ${photo.photoNo}`;
    img.loading = "lazy";
    img.addEventListener("click", () => openLightbox(photo.id));
    const meta = document.createElement("div");
    meta.className = "photo-meta";
    const id = document.createElement("span");
    id.className = "photo-id";
    id.textContent = photo.photoNo;
    const button = document.createElement("button");
    button.className = `select-photo${photo.selected ? " selected" : ""}`;
    button.textContent = photo.selected ? "♥" : "♡";
    button.setAttribute("aria-label", photo.selected ? "Unselect photo" : "Select photo");
    button.addEventListener("click", () => toggleSelection(photo.id));
    meta.append(id, button);
    card.append(img, meta);
    if (photo.selected) {
      const ribbon = document.createElement("span");
      ribbon.className = "selected-ribbon";
      ribbon.textContent = "SELECTED";
      card.append(ribbon);
    }
    grid.append(card);
  });
  $("selectedCount").textContent = `${selectedPhotos().length} selected`;
  $("totalCount").textContent = ` · ${photos.length} photographs`;
  $("eventTitle").textContent = "Arun & Priya — Wedding";
  $("eventSubtitle").textContent = "25 October 2026 · Select your favourite photographs";
}
async function toggleSelection(id) {
  const photo = photos.find(p => p.id === id);
  if (!photo) return;
  photo.selected = !photo.selected;
  await storePhoto(photo);
  renderGallery();
  refreshAdmin();
  if (!$("lightbox").hidden) updateLightbox();
}
function showGallery() {
  $("loginPanel").hidden = true;
  $("galleryPanel").hidden = false;
  renderGallery();
}
$("pinForm").addEventListener("submit", e => {
  e.preventDefault();
  if ($("pinInput").value.trim() === DEMO_PIN) {
    $("pinError").textContent = "";
    showGallery();
  } else $("pinError").textContent = "That PIN is not valid. Please check with the studio.";
});
$("logoutBtn").addEventListener("click", () => {
  $("galleryPanel").hidden = true;
  $("loginPanel").hidden = false;
  $("pinInput").value = "";
});
$("filterSelect").addEventListener("change", renderGallery);
$("reviewBtn").addEventListener("click", () => {
  $("filterSelect").value = "selected";
  renderGallery();
  window.scrollTo({top: 0, behavior: "smooth"});
});
$("confirmBtn").addEventListener("click", () => {
  if (!selectedPhotos().length) return showToast("Select at least one photograph first.");
  showToast(`${selectedPhotos().length} selections saved in this browser demo.`);
});

function openLightbox(id) {
  currentPhotoIndex = photos.findIndex(p => p.id === id);
  updateLightbox();
  $("lightbox").hidden = false;
}
function updateLightbox() {
  const photo = photos[currentPhotoIndex];
  if (!photo) return;
  $("lightboxImage").src = photo.preview;
  $("lightboxCaption").textContent = `${photo.photoNo} · Original: ${photo.originalName}`;
  $("lightboxSelect").textContent = photo.selected ? "♥ Selected — remove" : "♡ Select photo";
}
$("closeLightbox").addEventListener("click", () => $("lightbox").hidden = true);
$("prevPhoto").addEventListener("click", () => { currentPhotoIndex = (currentPhotoIndex - 1 + photos.length) % photos.length; updateLightbox(); });
$("nextPhoto").addEventListener("click", () => { currentPhotoIndex = (currentPhotoIndex + 1) % photos.length; updateLightbox(); });
$("lightboxSelect").addEventListener("click", () => { const p = photos[currentPhotoIndex]; if (p) toggleSelection(p.id); });
$("lightbox").addEventListener("click", e => { if (e.target === $("lightbox")) $("lightbox").hidden = true; });
document.addEventListener("keydown", e => {
  if ($("lightbox").hidden) return;
  if (e.key === "Escape") $("lightbox").hidden = true;
  if (e.key === "ArrowLeft") $("prevPhoto").click();
  if (e.key === "ArrowRight") $("nextPhoto").click();
  if (e.key === " ") { e.preventDefault(); $("lightboxSelect").click(); }
});

$("photoUpload").addEventListener("change", async e => {
  const files = [...e.target.files].filter(f => f.type.startsWith("image/"));
  if (!files.length) return;
  $("progressWrap").hidden = false;
  let added = 0;
  for (const file of files) {
    try {
      const blob = await makeWatermarkedPreview(file);
      const data = await blobToDataURL(blob);
      const existingCount = photos.length + added;
      const photoNo = String(existingCount + 1).padStart(4, "0");
      const record = {
        id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
        photoNo,
        originalName: file.name,
        preview: data,
        selected: false,
        order: existingCount
      };
      await storePhoto(record);
      added++;
      $("progressBar").style.width = `${Math.round(added / files.length * 100)}%`;
      $("progressText").textContent = `Processed ${added} of ${files.length}`;
    } catch (err) {
      console.error(err);
      showToast(`Could not process ${file.name}`);
    }
  }
  e.target.value = "";
  await loadPhotos();
  showToast(`${added} watermarked previews added to this browser.`);
  setTimeout(() => { $("progressWrap").hidden = true; $("progressBar").style.width = "0"; }, 1800);
});
$("clearPhotosBtn").addEventListener("click", async () => {
  if (!confirm("Delete all demo photos and selections from this browser?")) return;
  await clearAllPhotos();
  await loadPhotos();
  showToast("Demo gallery cleared.");
});
function refreshAdmin() {
  $("adminTotal").textContent = photos.length;
  $("adminSelected").textContent = selectedPhotos().length;
  $("adminStatus").textContent = selectedPhotos().length ? "Selection in progress" : "Awaiting selection";
  const list = $("adminSelectionList");
  const selected = selectedPhotos();
  list.innerHTML = "";
  if (!selected.length) { list.textContent = "No selections yet."; return; }
  selected.forEach(p => {
    const tag = document.createElement("span");
    tag.textContent = `${p.photoNo} · ${p.originalName}`;
    list.append(tag);
  });
}
function downloadText(filename, text, type="text/plain") {
  const blob = new Blob([text], {type});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
$("exportCsvBtn").addEventListener("click", () => {
  const rows = [["Photo number","Original filename","Event ID"]];
  selectedPhotos().forEach(p => rows.push([p.photoNo,p.originalName,"EVT001"]));
  const csv = rows.map(row => row.map(v => `"${String(v).replaceAll('"','""')}"`).join(",")).join("\n");
  downloadText("EVT001-selected-photos.csv", csv, "text/csv");
});
$("exportNamesBtn").addEventListener("click", async () => {
  const names = selectedPhotos().map(p => `${p.photoNo},${p.originalName}`).join("\n");
  if (!names) return showToast("No selected photos to copy.");
  try { await navigator.clipboard.writeText(names); showToast("Selected filenames copied."); }
  catch { downloadText("selected-filenames.txt", names); }
});

(async function init() {
  db = await openDB();
  await loadPhotos();
})();
