/**
 * LAND OF CAKRAWALA - INTERACTIVE CAMPUS MAP ENGINE
 * Mengontrol Denah Resmi UM (1024x820), Sinkronisasi Radar Minimap MLBB,
 * Warna Khusus Tiap Fakultas, & Integrasi Google GPS Real-Time Geolocation.
 * Profil Mahasiswa: Sobri Si Kodri (NIM: 24012145566)
 */

class LandOfCakrawalaApp {
  constructor() {
    this.viewport = document.getElementById("map-viewport");
    this.world = document.getElementById("map-world");
    this.routeSvg = document.getElementById("route-svg");
    this.markersLayer = document.getElementById("markers-layer");
    this.radarScreen = document.getElementById("radar-screen");
    this.radarCameraBox = document.getElementById("radar-camera-box");
    this.gpsHaloEl = document.getElementById("player-gps-halo");

    // Dimensi gambar asli denah
    this.mapWidth = CAMPUS_DATA.imageWidth;   // 1024px
    this.mapHeight = CAMPUS_DATA.imageHeight; // 820px

    // Transform State (Pan & Zoom)
    this.scale = 1.35;
    this.translateX = 0;
    this.translateY = 0;
    this.minScale = 0.7;
    this.maxScale = 3.8;

    // Dragging & Gesture State
    this.isDragging = false;
    this.startX = 0;
    this.startY = 0;
    this.initialTx = 0;
    this.initialTy = 0;
    this.pinchStartDist = 0;
    this.initialScale = 1;

    // Filter & Posisi Player (Sobri Si Kodri)
    this.activeCategory = "all";
    this.playerCoords = { ...CAMPUS_DATA.spawnPoint };
    this.playerMarkerEl = null;
    this.selectedBuilding = null;
    this.activeRouteTarget = null;
    this.markerElements = {};

    // Google GPS Geolocation State
    this.gpsWatchId = null;
    this.isGpsActive = false;
    this.lastGpsRaw = null;

    // Player RPG State (Sobri Si Kodri)
    this.player = {
      name: "Sobri Si Kodri",
      nim: "24012145566",
      level: 1,
      xp: 0,
      maxXp: 500,
      gold: 1500,
      sks: 22,
      completedQuests: new Set()
    };

    this.init();
  }

  init() {
    this.setupPanAndZoom();
    this.renderMarkers();
    this.renderPlayerMarker();
    this.initMinimapRadar();
    this.initCategoryFilters();
    this.initSearch();
    this.initSpellsAndControls();
    this.initPingWheel();
    this.initQuests();
    this.initClock();
    this.updatePlayerHud();

    // Pusatkan kamera awal ke area Rektorat & GKB
    setTimeout(() => {
      this.centerOnCoordinates(this.mapWidth * 0.38, this.mapHeight * 0.55, 1.35);
    }, 100);

    // Audio init on first gesture
    document.addEventListener("pointerdown", () => {
      soundFX.init();
    }, { once: true });
  }

  // =========================================================================
  // 1. PAN & ZOOM ENGINE (TOUCH & MOUSE)
  // =========================================================================
  setupPanAndZoom() {
    const vp = this.viewport;

    // Pointer Down (Drag Start)
    vp.addEventListener("pointerdown", (e) => {
      if (e.target.closest(".map-marker-pin") || e.target.closest(".map-floating-controls")) {
        return;
      }
      this.isDragging = true;
      vp.classList.add("grabbing");
      this.startX = e.clientX;
      this.startY = e.clientY;
      this.initialTx = this.translateX;
      this.initialTy = this.translateY;
      vp.setPointerCapture(e.pointerId);
    });

    // Pointer Move (Dragging)
    vp.addEventListener("pointermove", (e) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.startX;
      const dy = e.clientY - this.startY;
      this.translateX = this.initialTx + dx;
      this.translateY = this.initialTy + dy;
      this.applyTransform();
    });

    // Pointer Up / Cancel
    const endDrag = (e) => {
      if (this.isDragging) {
        this.isDragging = false;
        vp.classList.remove("grabbing");
        try { vp.releasePointerCapture(e.pointerId); } catch(err) {}
      }
    };
    vp.addEventListener("pointerup", endDrag);
    vp.addEventListener("pointercancel", endDrag);

    // Mouse Wheel Zoom (Centered on Cursor)
    vp.addEventListener("wheel", (e) => {
      e.preventDefault();
      const rect = vp.getBoundingClientRect();
      const cursorX = e.clientX - rect.left;
      const cursorY = e.clientY - rect.top;

      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
      this.zoomAtPoint(cursorX, cursorY, zoomFactor);
    }, { passive: false });

    // Touch Pinch-to-Zoom
    let activeTouches = [];
    vp.addEventListener("touchstart", (e) => {
      activeTouches = Array.from(e.touches);
      if (activeTouches.length === 2) {
        this.pinchStartDist = this.getTouchDistance(activeTouches[0], activeTouches[1]);
        this.initialScale = this.scale;
      }
    });

    vp.addEventListener("touchmove", (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const dist = this.getTouchDistance(e.touches[0], e.touches[1]);
        const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;

        const zoomFactor = dist / this.pinchStartDist;
        const newScale = Math.min(this.maxScale, Math.max(this.minScale, this.initialScale * zoomFactor));
        this.zoomTo(newScale, midX, midY);
      }
    }, { passive: false });

    window.addEventListener("resize", () => {
      this.applyTransform();
    });

    // Floating Controls
    document.getElementById("btn-zoom-in")?.addEventListener("click", () => {
      soundFX.playClick();
      const cx = vp.clientWidth / 2;
      const cy = vp.clientHeight / 2;
      this.zoomAtPoint(cx, cy, 1.25);
    });

    document.getElementById("btn-zoom-out")?.addEventListener("click", () => {
      soundFX.playClick();
      const cx = vp.clientWidth / 2;
      const cy = vp.clientHeight / 2;
      this.zoomAtPoint(cx, cy, 0.8);
    });

    document.getElementById("btn-zoom-reset")?.addEventListener("click", () => {
      soundFX.playClick();
      this.resetFullView();
    });

    document.getElementById("btn-center-rektorat")?.addEventListener("click", () => {
      soundFX.playClick();
      const rektorat = CAMPUS_DATA.locations.find(l => l.id === "rektorat");
      if (rektorat) this.flyToLocation(rektorat);
    });

    document.getElementById("btn-locate-me")?.addEventListener("click", () => {
      soundFX.playClick();
      this.flyToLocation({ x: this.playerCoords.x, y: this.playerCoords.y }, 2.0);
    });
  }

  getTouchDistance(t1, t2) {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  zoomAtPoint(cursorX, cursorY, factor) {
    const newScale = Math.min(this.maxScale, Math.max(this.minScale, this.scale * factor));
    this.zoomTo(newScale, cursorX, cursorY);
  }

  zoomTo(newScale, pivotX, pivotY) {
    const worldX = (pivotX - this.translateX) / this.scale;
    const worldY = (pivotY - this.translateY) / this.scale;

    this.scale = newScale;
    this.translateX = pivotX - worldX * this.scale;
    this.translateY = pivotY - worldY * this.scale;

    this.applyTransform();
  }

  applyTransform(transition = false) {
    if (transition) {
      this.world.style.transition = "transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)";
      setTimeout(() => { this.world.style.transition = ""; }, 650);
    }
    this.world.style.transform = `translate(${this.translateX}px, ${this.translateY}px) scale(${this.scale})`;
    this.updateMinimapCameraBox();
  }

  centerOnCoordinates(x, y, targetScale = null) {
    if (targetScale) this.scale = targetScale;
    const vpW = this.viewport.clientWidth;
    const vpH = this.viewport.clientHeight;

    this.translateX = vpW / 2 - x * this.scale;
    this.translateY = vpH / 2 - y * this.scale;

    this.applyTransform(true);
  }

  flyToLocation(loc, targetScale = 1.9) {
    const px = (loc.x / 100) * this.mapWidth;
    const py = (loc.y / 100) * this.mapHeight;
    this.centerOnCoordinates(px, py, targetScale);
  }

  resetFullView() {
    const vpW = this.viewport.clientWidth;
    const vpH = this.viewport.clientHeight;
    const scaleX = vpW / this.mapWidth;
    const scaleY = vpH / this.mapHeight;
    this.scale = Math.min(scaleX, scaleY) * 0.95;

    this.translateX = (vpW - this.mapWidth * this.scale) / 2;
    this.translateY = (vpH - this.mapHeight * this.scale) / 2;
    this.applyTransform(true);
  }

  // =========================================================================
  // 2. RENDER MARKERS DENGAN WARNA RESMI FAKULTAS
  // =========================================================================
  renderMarkers() {
    this.markersLayer.innerHTML = "";
    this.markerElements = {};

    CAMPUS_DATA.locations.forEach(loc => {
      const pin = document.createElement("div");
      pin.className = "map-marker-pin";
      pin.id = `pin-${loc.id}`;
      pin.style.left = `${loc.x}%`;
      pin.style.top = `${loc.y}%`;

      // Cek apakah gedung ini milik fakultas khusus yang memiliki warna resmi
      let pinClass = `pin-${loc.category}`;
      let labelText = loc.code || loc.name.split(" ")[0];

      if (loc.facultyCode) {
        pinClass = `pin-faculty-${loc.facultyCode}`;
        pin.classList.add(pinClass);
      }

      let iconEmoji = "🏛️";
      if (loc.category === "fakultas") iconEmoji = "🎓";
      if (loc.category === "kuliner") iconEmoji = "🍗";
      if (loc.category === "ibadah") iconEmoji = "🕌";
      if (loc.category === "olahraga") iconEmoji = "⚔️";
      if (loc.category === "fasilitas") iconEmoji = "📚";
      if (loc.category === "gerbang") iconEmoji = "🚪";

      pin.innerHTML = `
        <div class="pin-icon-wrap">
          <span class="pin-emoji">${iconEmoji}</span>
        </div>
        <div class="pin-tag">${labelText}</div>
      `;

      pin.addEventListener("click", (e) => {
        e.stopPropagation();
        soundFX.playClick();
        this.openDrawer(loc);
        this.flyToLocation(loc, 1.8);
      });

      this.markersLayer.appendChild(pin);
      this.markerElements[loc.id] = pin;
    });
  }

  renderPlayerMarker() {
    const existing = document.getElementById("player-map-marker");
    if (existing) existing.remove();

    this.playerMarkerEl = document.createElement("div");
    this.playerMarkerEl.id = "player-map-marker";
    this.playerMarkerEl.className = "player-map-marker";
    this.playerMarkerEl.title = `Hero: ${this.player.name} (${this.player.nim})`;
    this.playerMarkerEl.style.left = `${this.playerCoords.x}%`;
    this.playerMarkerEl.style.top = `${this.playerCoords.y}%`;

    this.markersLayer.appendChild(this.playerMarkerEl);

    // Sync Halo GPS
    if (this.gpsHaloEl) {
      this.gpsHaloEl.style.left = `${this.playerCoords.x}%`;
      this.gpsHaloEl.style.top = `${this.playerCoords.y}%`;
    }
  }

  // =========================================================================
  // 3. MINIMAP RADAR SYNCHRONIZATION DENGAN WARNA FAKULTAS
  // =========================================================================
  initMinimapRadar() {
    if (!this.radarScreen) return;

    this.radarScreen.querySelectorAll(".radar-blip, .radar-player-blip").forEach(el => el.remove());

    CAMPUS_DATA.locations.forEach(loc => {
      let blipType = "blip-faculty";
      if (loc.facultyCode) {
        blipType = `blip-${loc.facultyCode}`;
      } else if (loc.id === "rektorat" || loc.id.includes("gkb")) {
        blipType = "blip-hq";
      } else if (loc.id === "graca" || loc.id.includes("stadion")) {
        blipType = "blip-arena";
      } else if (loc.category === "kuliner") {
        blipType = "blip-food";
      }

      const blip = document.createElement("div");
      blip.className = `radar-blip ${blipType}`;
      blip.style.left = `${loc.x}%`;
      blip.style.top = `${loc.y}%`;
      blip.title = loc.name;

      blip.addEventListener("click", (e) => {
        e.stopPropagation();
        soundFX.playPing();
        this.flyToLocation(loc, 1.8);
        this.openDrawer(loc);
      });

      this.radarScreen.appendChild(blip);
    });

    // Radar Player Blip (Sobri Si Kodri)
    this.radarPlayerBlip = document.createElement("div");
    this.radarPlayerBlip.className = "radar-player-blip";
    this.radarPlayerBlip.style.left = `${this.playerCoords.x}%`;
    this.radarPlayerBlip.style.top = `${this.playerCoords.y}%`;
    this.radarScreen.appendChild(this.radarPlayerBlip);

    this.radarScreen.addEventListener("click", (e) => {
      const rect = this.radarScreen.getBoundingClientRect();
      const clickXRatio = (e.clientX - rect.left) / rect.width;
      const clickYRatio = (e.clientY - rect.top) / rect.height;

      const targetWorldX = clickXRatio * this.mapWidth;
      const targetWorldY = clickYRatio * this.mapHeight;

      soundFX.playPing();
      this.centerOnCoordinates(targetWorldX, targetWorldY);
    });
  }

  updateMinimapCameraBox() {
    if (!this.radarCameraBox || !this.viewport) return;
    const vpW = this.viewport.clientWidth;
    const vpH = this.viewport.clientHeight;

    const visibleX1 = -this.translateX / this.scale;
    const visibleY1 = -this.translateY / this.scale;
    const visibleW = vpW / this.scale;
    const visibleH = vpH / this.scale;

    const leftPercent = Math.max(0, Math.min(100, (visibleX1 / this.mapWidth) * 100));
    const topPercent = Math.max(0, Math.min(100, (visibleY1 / this.mapHeight) * 100));
    const widthPercent = Math.max(5, Math.min(100, (visibleW / this.mapWidth) * 100));
    const heightPercent = Math.max(5, Math.min(100, (visibleH / this.mapHeight) * 100));

    this.radarCameraBox.style.left = `${leftPercent}%`;
    this.radarCameraBox.style.top = `${topPercent}%`;
    this.radarCameraBox.style.width = `${widthPercent}%`;
    this.radarCameraBox.style.height = `${heightPercent}%`;
  }

  // =========================================================================
  // 4. GOOGLE GPS REAL-TIME GEOLOCATION ENGINE
  // =========================================================================
  toggleGoogleGPS() {
    soundFX.playClick();
    const gpsBtn = document.getElementById("btn-toggle-gps");
    const gpsToast = document.getElementById("gps-status-toast");
    const toastTitle = document.getElementById("gps-status-title");
    const toastCoords = document.getElementById("gps-status-coords");

    if (this.isGpsActive) {
      // Matikan GPS
      if (this.gpsWatchId !== null) {
        navigator.geolocation.clearWatch(this.gpsWatchId);
        this.gpsWatchId = null;
      }
      this.isGpsActive = false;
      gpsBtn?.classList.remove("gps-active");
      if (this.gpsHaloEl) this.gpsHaloEl.style.display = "none";
      if (gpsToast) gpsToast.classList.remove("active");
      soundFX.announce("Google GPS Dinonaktifkan.");
      return;
    }

    // Aktifkan Google GPS
    if (!("geolocation" in navigator)) {
      alert("Browser Anda tidak mendukung layanan deteksi lokasi GPS.");
      return;
    }

    gpsBtn?.classList.add("gps-active");
    if (gpsToast) gpsToast.classList.add("active");
    if (toastTitle) toastTitle.textContent = "Google GPS: Mengunci Satelit...";
    if (toastCoords) toastCoords.textContent = "Menghubungkan layanan lokasi...";

    soundFX.announce("Menghubungkan ke Google GPS pendeteksi lokasi.");

    this.gpsWatchId = navigator.geolocation.watchPosition(
      (position) => {
        this.handleGpsPositionUpdate(position);
      },
      (error) => {
        console.warn("GPS Error:", error);
        if (toastTitle) toastTitle.textContent = "GPS: Gagal Mengakses Lokasi";
        if (toastCoords) toastCoords.textContent = error.message || "Izin lokasi ditolak";
        gpsBtn?.classList.remove("gps-active");
        this.isGpsActive = false;
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 2000
      }
    );

    this.isGpsActive = true;
  }

  handleGpsPositionUpdate(pos) {
    const { latitude, longitude, accuracy } = pos.coords;
    this.lastGpsRaw = { lat: latitude, lng: longitude, acc: accuracy };

    const toastTitle = document.getElementById("gps-status-title");
    const toastCoords = document.getElementById("gps-status-coords");

    // Konversi Koordinat Geografis (Lat/Lng) ke Persentase Denah (x%, y%)
    const mapped = this.convertGpsToDenahCoords(latitude, longitude);

    const bounds = CAMPUS_DATA.gpsCalibration.bounds;
    const isInsideCampus = (
      latitude >= bounds.minLat && latitude <= bounds.maxLat &&
      longitude >= bounds.minLng && longitude <= bounds.maxLng
    );

    if (isInsideCampus) {
      // User berada di dalam area Kampus UM!
      this.playerCoords.x = mapped.x;
      this.playerCoords.y = mapped.y;

      if (toastTitle) toastTitle.textContent = "🟢 Google GPS: Lokasi Real-Time Aktif";
      if (toastCoords) toastCoords.textContent = `Lat: ${latitude.toFixed(5)}, Lng: ${longitude.toFixed(5)} (±${Math.round(accuracy)}m)`;

      // Update Tampilan Marker Player & Halo
      if (this.playerMarkerEl) {
        this.playerMarkerEl.style.left = `${this.playerCoords.x}%`;
        this.playerMarkerEl.style.top = `${this.playerCoords.y}%`;
      }
      if (this.gpsHaloEl) {
        this.gpsHaloEl.style.display = "block";
        this.gpsHaloEl.style.left = `${this.playerCoords.x}%`;
        this.gpsHaloEl.style.top = `${this.playerCoords.y}%`;
      }
      if (this.radarPlayerBlip) {
        this.radarPlayerBlip.style.left = `${this.playerCoords.x}%`;
        this.radarPlayerBlip.style.top = `${this.playerCoords.y}%`;
      }

      // Update Rute Aktif jika ada
      if (this.activeRouteTarget) {
        this.updateRoutePath(this.activeRouteTarget);
      }
    } else {
      // User di luar kampus (misal sedang tes dari rumah / luar kota)
      if (toastTitle) toastTitle.textContent = "📍 Google GPS Terhubung (Di Luar Kampus UM)";
      if (toastCoords) toastCoords.textContent = `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)} • Avatar disimulasi di Gerbang Utama`;

      if (this.gpsHaloEl) this.gpsHaloEl.style.display = "none";
    }
  }

  // Algoritma Kalibrasi Geospatial Affine Transformation
  convertGpsToDenahCoords(lat, lng) {
    const anchors = CAMPUS_DATA.gpsCalibration.anchors;
    // Inverse Distance Weighting Interpolation
    let totalWeight = 0;
    let interpX = 0;
    let interpY = 0;

    for (const a of anchors) {
      const dLat = lat - a.lat;
      const dLng = lng - a.lng;
      const dist = Math.sqrt(dLat * dLat + dLng * dLng);
      if (dist < 0.00001) {
        return { x: a.x, y: a.y };
      }
      const weight = 1 / (dist * dist);
      totalWeight += weight;
      interpX += a.x * weight;
      interpY += a.y * weight;
    }

    const resX = Math.max(5, Math.min(95, interpX / totalWeight));
    const resY = Math.max(5, Math.min(95, interpY / totalWeight));
    return { x: resX, y: resY };
  }

  // =========================================================================
  // 5. CATEGORY FILTER SYSTEM (ROLE TABS)
  // =========================================================================
  initCategoryFilters() {
    const container = document.getElementById("category-filter-hud");
    if (!container) return;

    container.innerHTML = "";
    CAMPUS_DATA.categories.forEach(cat => {
      const chip = document.createElement("button");
      chip.className = `filter-chip ${cat.id === this.activeCategory ? "active" : ""}`;
      chip.innerHTML = `<span>${cat.icon}</span> <span>${cat.label}</span>`;

      chip.addEventListener("click", () => {
        soundFX.playClick();
        document.querySelectorAll(".filter-chip").forEach(c => c.classList.remove("active"));
        chip.classList.add("active");
        this.filterMarkersByCategory(cat.id);
      });

      container.appendChild(chip);
    });
  }

  filterMarkersByCategory(categoryId) {
    this.activeCategory = categoryId;
    CAMPUS_DATA.locations.forEach(loc => {
      const el = this.markerElements[loc.id];
      if (!el) return;
      if (categoryId === "all" || loc.category === categoryId) {
        el.style.display = "flex";
      } else {
        el.style.display = "none";
      }
    });
  }

  // =========================================================================
  // 6. SEARCH ENGINE (AUTOCOMPLETE DROPDOWN)
  // =========================================================================
  initSearch() {
    const searchInput = document.getElementById("search-input");
    const searchResults = document.getElementById("search-results");
    const clearBtn = document.getElementById("search-clear");
    if (!searchInput || !searchResults) return;

    searchInput.addEventListener("input", (e) => {
      const query = e.target.value.toLowerCase().trim();
      if (query.length > 0) {
        clearBtn.classList.add("active");
        const matches = CAMPUS_DATA.locations.filter(loc =>
          loc.name.toLowerCase().includes(query) ||
          loc.alias.toLowerCase().includes(query) ||
          loc.code.toLowerCase().includes(query) ||
          loc.description.toLowerCase().includes(query) ||
          loc.facilities.some(f => f.toLowerCase().includes(query))
        );
        this.renderSearchResults(matches);
      } else {
        clearBtn.classList.remove("active");
        searchResults.classList.remove("open");
      }
    });

    clearBtn.addEventListener("click", () => {
      searchInput.value = "";
      clearBtn.classList.remove("active");
      searchResults.classList.remove("open");
      soundFX.playClick();
    });

    document.addEventListener("click", (e) => {
      if (!e.target.closest(".search-wrapper")) {
        searchResults.classList.remove("open");
      }
    });
  }

  renderSearchResults(results) {
    const searchResults = document.getElementById("search-results");
    searchResults.innerHTML = "";

    if (results.length === 0) {
      searchResults.innerHTML = `
        <div style="padding: 14px; text-align: center; color: var(--text-muted); font-size: 12px;">
          Tidak ada landmark atau gedung ditemukan. Coba kata kunci lain (misal: FIP, FT, GKB, C3).
        </div>
      `;
      searchResults.classList.add("open");
      return;
    }

    results.forEach(loc => {
      const item = document.createElement("div");
      item.className = "search-item";
      item.innerHTML = `
        <div class="search-item-info">
          <div class="search-item-name">${loc.name}</div>
          <div class="search-item-meta">${loc.lane} &bull; ${loc.code}</div>
        </div>
        <div class="search-item-badge">${loc.category.toUpperCase()}</div>
      `;

      item.addEventListener("click", () => {
        soundFX.playClick();
        searchResults.classList.remove("open");
        document.getElementById("search-input").value = loc.name;
        this.flyToLocation(loc, 1.85);
        this.openDrawer(loc);
      });

      searchResults.appendChild(item);
    });

    searchResults.classList.add("open");
  }

  // =========================================================================
  // 7. LANDMARK DRAWER (HERO STATS / BUILDING DETAILS)
  // =========================================================================
  openDrawer(loc) {
    this.selectedBuilding = loc;
    const drawer = document.getElementById("landmark-drawer");
    if (!drawer) return;

    document.getElementById("drawer-name").textContent = loc.name;
    document.getElementById("drawer-alias").textContent = loc.alias;
    document.getElementById("drawer-code").textContent = loc.code;
    document.getElementById("drawer-lane").textContent = loc.lane;
    document.getElementById("drawer-role-tag").textContent = loc.role;
    document.getElementById("drawer-image").src = loc.image;
    document.getElementById("drawer-description").textContent = loc.description;
    document.getElementById("drawer-floors").textContent = loc.floors;
    document.getElementById("drawer-maba-tips").textContent = loc.mabaTips;

    // Tombol Google Maps Eksternal
    const gmapsBtn = document.getElementById("drawer-btn-gmaps");
    if (gmapsBtn && loc.lat && loc.lng) {
      gmapsBtn.onclick = () => {
        soundFX.playClick();
        const url = `https://www.google.com/maps/dir/?api=1&destination=${loc.lat},${loc.lng}`;
        window.open(url, "_blank");
      };
    }

    // Facilities Chips
    const facContainer = document.getElementById("drawer-facilities");
    facContainer.innerHTML = "";
    loc.facilities.forEach(f => {
      const tag = document.createElement("span");
      tag.className = "facility-tag";
      tag.textContent = `✓ ${f}`;
      facContainer.appendChild(tag);
    });

    // Check Quest Progress if this building is a quest target
    const relatedQuest = CAMPUS_DATA.quests.find(q => q.targetId === loc.id);
    const questBtn = document.getElementById("drawer-btn-quest");
    if (relatedQuest && !this.player.completedQuests.has(relatedQuest.id)) {
      questBtn.style.display = "flex";
      questBtn.textContent = `🎁 Klaim Misi Maba (+${relatedQuest.rewardXp} XP)`;
      questBtn.onclick = () => {
        this.completeQuest(relatedQuest.id);
        questBtn.style.display = "none";
      };
    } else {
      questBtn.style.display = "none";
    }

    drawer.classList.add("open");
  }

  closeDrawer() {
    soundFX.playClick();
    const drawer = document.getElementById("landmark-drawer");
    if (drawer) drawer.classList.remove("open");
  }

  // =========================================================================
  // 8. WAYPOINT NAVIGATION / GLOWING ROUTE PATHFINDER
  // =========================================================================
  setWaypointToTarget(loc) {
    if (!loc) loc = this.selectedBuilding;
    if (!loc) return;

    soundFX.playTargetLock();
    this.activeRouteTarget = loc;
    this.closeDrawer();

    this.updateRoutePath(loc);

    // Announce Voice
    soundFX.announce(`Waypoint ditetapkan ke ${loc.name}.`);
  }

  updateRoutePath(loc) {
    const startX = (this.playerCoords.x / 100) * this.mapWidth;
    const startY = (this.playerCoords.y / 100) * this.mapHeight;
    const targetX = (loc.x / 100) * this.mapWidth;
    const targetY = (loc.y / 100) * this.mapHeight;

    const pixelDistance = Math.hypot(targetX - startX, targetY - startY);
    const distanceMeters = Math.max(40, Math.round(pixelDistance * 1.15));
    const walkMinutes = Math.max(1, Math.ceil(distanceMeters / 75));

    const midX = (startX + targetX) / 2 + (targetY - startY) * 0.12;
    const midY = (startY + targetY) / 2 - (targetX - startX) * 0.12;

    this.routeSvg.innerHTML = `
      <path class="route-path-glow" d="M ${startX} ${startY} Q ${midX} ${midY} ${targetX} ${targetY}" />
    `;

    const navBanner = document.getElementById("navigation-banner");
    document.getElementById("nav-target-name").textContent = loc.name;
    document.getElementById("nav-metrics").textContent = `Jarak: ~${distanceMeters} m • Estimasi Jalan Kaki: ${walkMinutes} Menit`;
    navBanner.classList.add("active");

    this.centerOnCoordinates((startX + targetX) / 2, (startY + targetY) / 2, 1.45);
  }

  stopNavigation() {
    soundFX.playClick();
    this.routeSvg.innerHTML = "";
    const navBanner = document.getElementById("navigation-banner");
    if (navBanner) navBanner.classList.remove("active");
    this.activeRouteTarget = null;
  }

  // =========================================================================
  // 9. BATTLE SPELLS & CONTROLS (RECALL & SPRINT)
  // =========================================================================
  initSpellsAndControls() {
    // 0. GOOGLE GPS TOGGLE
    const gpsBtn = document.getElementById("btn-toggle-gps");
    if (gpsBtn) {
      gpsBtn.addEventListener("click", () => this.toggleGoogleGPS());
    }

    // 1. RECALL SPELL (Teleportasi ke Gerbang Semarang)
    const recallBtn = document.getElementById("spell-recall");
    if (recallBtn) {
      recallBtn.addEventListener("click", () => {
        soundFX.playRecall();
        const recallOverlay = document.getElementById("recall-overlay");
        recallOverlay.classList.add("active");

        soundFX.announce("Recall diaktifkan! Sobri Si Kodri kembali ke Gerbang Utama.");

        setTimeout(() => {
          this.playerCoords = { ...CAMPUS_DATA.spawnPoint };
          this.renderPlayerMarker();
          if (this.radarPlayerBlip) {
            this.radarPlayerBlip.style.left = `${this.playerCoords.x}%`;
            this.radarPlayerBlip.style.top = `${this.playerCoords.y}%`;
          }
          this.stopNavigation();
          this.flyToLocation({ x: this.playerCoords.x, y: this.playerCoords.y }, 1.7);
          recallOverlay.classList.remove("active");
        }, 1600);
      });
    }

    // 2. SPRINT / SPEED BOOST SPELL (Reset View Seluruh Kampus)
    const sprintBtn = document.getElementById("spell-sprint");
    if (sprintBtn) {
      sprintBtn.addEventListener("click", () => {
        soundFX.playClick();
        soundFX.announce("Mode Jelajah Penuh Aktif!");
        this.resetFullView();
      });
    }

    // 3. SOUND TOGGLE
    const soundBtn = document.getElementById("btn-toggle-sound");
    if (soundBtn) {
      soundBtn.addEventListener("click", () => {
        const enabled = soundFX.toggleSound();
        soundBtn.textContent = enabled ? "🔊" : "🔇";
        soundFX.playClick();
      });
    }

    // 4. QUEST LOG MODAL TOGGLE
    const questBtn = document.getElementById("btn-open-quests");
    const questModal = document.getElementById("quest-modal");
    if (questBtn && questModal) {
      questBtn.addEventListener("click", () => {
        soundFX.playClick();
        questModal.classList.add("open");
      });
    }
    const questCloseBtn = document.getElementById("quest-modal-close");
    if (questCloseBtn) {
      questCloseBtn.addEventListener("click", () => {
        soundFX.playClick();
        document.getElementById("quest-modal").classList.remove("open");
      });
    }

    // 5. DENAH RESMI UM MODAL TOGGLE
    const denahBtn = document.getElementById("btn-open-denah");
    const denahModal = document.getElementById("denah-modal");
    if (denahBtn && denahModal) {
      denahBtn.addEventListener("click", () => {
        soundFX.playClick();
        denahModal.classList.add("open");
      });
    }
    const denahCloseBtn = document.getElementById("denah-modal-close");
    if (denahCloseBtn && denahModal) {
      denahCloseBtn.addEventListener("click", () => {
        soundFX.playClick();
        denahModal.classList.remove("open");
      });
    }
  }

  // =========================================================================
  // 10. MLBB PING QUICK WHEEL
  // =========================================================================
  initPingWheel() {
    const pingBtn = document.getElementById("spell-ping");
    const pingOverlay = document.getElementById("ping-wheel-overlay");
    const pingClose = document.getElementById("ping-wheel-center");
    if (!pingBtn || !pingOverlay) return;

    pingBtn.addEventListener("click", () => {
      soundFX.playPing();
      pingOverlay.classList.add("open");
    });

    pingClose.addEventListener("click", () => {
      soundFX.playClick();
      pingOverlay.classList.remove("open");
    });

    pingOverlay.addEventListener("click", (e) => {
      if (e.target === pingOverlay) {
        pingOverlay.classList.remove("open");
      }
    });

    const pingActions = {
      kelas: () => this.quickFindAndRoute("gkb_a19", "Menuju Gedung Kuliah Bersama A19"),
      perpus: () => this.quickFindAndRoute("perpus_c3", "Menuju Perpustakaan Pusat UM C3"),
      makan: () => this.quickFindAndRoute("kantin_pusat", "Menuju Kantin Halal Mahasiswa"),
      masjid: () => this.quickFindAndRoute("masjid_alhikmah", "Menuju Masjid Al-Hikmah UM"),
      medis: () => this.quickFindAndRoute("fk_um", "Menuju Fakultas Kedokteran"),
      gerbang: () => this.quickFindAndRoute("gerbang_semarang", "Menuju Gerbang Utama Jl Semarang")
    };

    document.querySelectorAll(".ping-wheel-node").forEach(node => {
      node.addEventListener("click", () => {
        const actionKey = node.getAttribute("data-action");
        pingOverlay.classList.remove("open");
        if (pingActions[actionKey]) {
          pingActions[actionKey]();
        }
      });
    });
  }

  quickFindAndRoute(locationId, voiceMessage) {
    const target = CAMPUS_DATA.locations.find(l => l.id === locationId);
    if (target) {
      soundFX.playPing();
      this.flyToLocation(target, 1.85);
      this.setWaypointToTarget(target);
      if (voiceMessage) soundFX.announce(voiceMessage);
    }
  }

  // =========================================================================
  // 11. MABA QUEST & LEVEL SYSTEM (SOBRI SI KODRI)
  // =========================================================================
  initQuests() {
    const questContainer = document.getElementById("quest-list-body");
    if (!questContainer) return;

    questContainer.innerHTML = "";
    CAMPUS_DATA.quests.forEach(q => {
      const isDone = this.player.completedQuests.has(q.id);
      const card = document.createElement("div");
      card.className = `quest-card ${isDone ? "completed" : ""}`;
      card.id = `card-${q.id}`;

      card.innerHTML = `
        <div class="quest-info">
          <div class="quest-card-title">${q.title} ${isDone ? "✅" : ""}</div>
          <div class="quest-card-desc">${q.desc}</div>
          <div class="quest-reward">+${q.rewardXp} XP • +${q.rewardGold} Koin UKT • Badge: ${q.badge}</div>
        </div>
        <div>
          ${
            isDone
              ? '<span style="font-size: 11px; color: var(--ml-green); font-weight: 800;">SELESAI</span>'
              : `<button class="quest-track-btn" data-target="${q.targetId}">Lacak Lokasi</button>`
          }
        </div>
      `;

      const trackBtn = card.querySelector(".quest-track-btn");
      if (trackBtn) {
        trackBtn.addEventListener("click", () => {
          soundFX.playClick();
          document.getElementById("quest-modal").classList.remove("open");
          const target = CAMPUS_DATA.locations.find(l => l.id === q.targetId);
          if (target) {
            this.flyToLocation(target, 1.85);
            this.openDrawer(target);
          }
        });
      }

      questContainer.appendChild(card);
    });
  }

  completeQuest(questId) {
    if (this.player.completedQuests.has(questId)) return;
    const quest = CAMPUS_DATA.quests.find(q => q.id === questId);
    if (!quest) return;

    this.player.completedQuests.add(questId);
    this.player.xp += quest.rewardXp;
    this.player.gold += quest.rewardGold;

    if (this.player.xp >= this.player.maxXp) {
      this.player.level += 1;
      this.player.xp = this.player.xp - this.player.maxXp;
      this.player.maxXp += 300;
      soundFX.announce(`Selamat Sobri Si Kodri! Naik ke Semester ${this.player.level}!`);
    }

    soundFX.playVictory();
    this.updatePlayerHud();
    this.initQuests();
  }

  updatePlayerHud() {
    const levelEl = document.getElementById("player-level");
    const goldEl = document.getElementById("score-gold");

    if (levelEl) levelEl.textContent = this.player.level;
    if (goldEl) goldEl.textContent = `${this.player.gold.toLocaleString()} UKT`;
  }

  initClock() {
    const updateTime = () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
      const clockEl = document.getElementById("game-clock");
      if (clockEl) clockEl.textContent = `⏱️ ${timeStr} WIB`;
    };
    updateTime();
    setInterval(updateTime, 30000);
  }
}

// Inisialisasi saat DOM siap
window.addEventListener("DOMContentLoaded", () => {
  window.app = new LandOfCakrawalaApp();
});
