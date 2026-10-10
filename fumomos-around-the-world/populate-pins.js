
'use strict';

let selectedPin = null;
let hideFound = false;
let pins = [];
let currImg = 1;

var pinIcon = L.icon({
    iconUrl: 'icons/pin-icon.png',
    iconSize: [30, 44],
    iconAnchor: [15, 44],
    popupAnchor: [0, -34]
});

// CSV: index, username, location, description, "lat,lon", image filenames, YouTube URL, optional found status
function csvToArray(data) {
    const result = Papa.parse(data, { skipEmptyLines: true }).data;

    return result.map(pin => {
        const coordinates = pin[4].replace(/[\[\]\(\)\s]/g, "").split(",");

        pin.splice(4, 1, parseFloat(coordinates[0]), parseFloat(coordinates[1]));
        pin[6] = (pin[6] || "").split("|").map(file => file.trim()).filter(Boolean);
        pin[7] = (pin[7] || "").trim();
        pin[8] = (pin[8] || "0").trim();

        return pin;
    });
}

const markerCluster = L.markerClusterGroup({
    maxClusterRadius: 20,
    zoomToBoundsOnClick: true,
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false
});

function populatePins(pins) {
    pins.forEach(function (pin) {
        const marker = L.marker([pin[4], pin[5]], {
            icon: pinIcon,
            riseOnHover: true
        });

        pin.marker = marker;

        const popupContent = `
            <div id="popup">
                <h3>Sighting #${pin[0]}</h3>
                <button class="found-button" id="button${pin[0]}">
                    ${pin[8] === "1" ? "Mark as Not Found" : "Mark as Found"}
                </button>
            </div>
        `;

        marker.bindPopup(popupContent);

        marker.on('popupopen', function () {
            const button = document.getElementById(`button${pin[0]}`);

            if (pin[8] === "1") {
                button.textContent = "Mark as Not Found";
                button.classList.add("found");
            } else {
                button.textContent = "Mark as Found";
                button.classList.remove("found");
            }

            button.addEventListener('click', function () {
                markFound(pin, button);
            });
        });

        marker.on('click', function () {
            selectedPin = pin;
            updateSidebar(pin);

            if (map.getZoom() < 8) {
                map.flyTo([pin[4], pin[5]], 8, {
                    duration: 0.5,
                    easeLinearity: 0.25
                });
            } else if (map.getCenter().distanceTo(L.latLng(pin[4], pin[5])) > 100000) {
                map.panTo([pin[4], pin[5]], {
                    duration: 0.5,
                    easeLinearity: 0.25
                });
            }
        });

        if (pin[8] === "1") {
            showFoundMarker(pin);
        } else {
            markerCluster.addLayer(marker);
        }
    });

    map.addLayer(markerCluster);

    document.getElementById("total-count").textContent = pins.length;

    const foundCount = pins.filter(pin => pin[8] === "1").length;
    document.getElementById("found-count").textContent = foundCount;
    document.getElementById("progress-fill").style.width =
        `${pins.length ? (foundCount / pins.length) * 100 : 0}%`;
}

function loadPins() {
    fetch('locations.csv')
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to load locations.csv: ${response.status}`);
            }
            return response.text();
        })
        .then(csv => {
            pins = csvToArray(csv);
            populatePins(pins);
        })
        .catch(error => {
            console.error('Error loading CSV:', error);
        });
}

// Update sidebar fields
function updateSidebar(pin) {
    const locationIcon = document.getElementById("sidebar-location-icon");

    document.getElementById("sidebar-title").textContent = `Mocha Sighting #${pin[0]}`;
    document.getElementById("sidebar-username").textContent =
        pin[1] === "" ? "Submitted by Anonymous" : `Submitted by ${pin[1]}`;

    currImg = 1;
    renderSidebarMedia();

    document.getElementById("sidebar-image-switcher").style.display =
        getMediaCount(pin) > 1 ? "flex" : "none";

    locationIcon.style.display = pin[2] ? "flex" : "none";
    document.getElementById("sidebar-location-text").textContent = pin[2];
    document.getElementById("sidebar-description").textContent = pin[3];
}

// Videos count as one media item
function getImageCount(pin) {
    return pin && Array.isArray(pin[6]) ? pin[6].length : 0;
}

function getMediaCount(pin) {
    if (!pin) return 0;
    return getImageCount(pin) + (pin[7] ? 1 : 0);
}

function getYouTubeEmbedUrl(url) {
    if (!url) return null;

    try {
        const parsed = new URL(url);
        let videoId = "";

        if (parsed.hostname === "youtu.be") {
            videoId = parsed.pathname.slice(1);
        } else if (
            parsed.hostname.endsWith("youtube.com") ||
            parsed.hostname.endsWith("youtube-nocookie.com")
        ) {
            if (parsed.pathname === "/watch") {
                videoId = parsed.searchParams.get("v") || "";
            } else {
                const match = parsed.pathname.match(
                    /^\/(?:embed|shorts|live)\/([^/?]+)/
                );
                videoId = match ? match[1] : "";
            }
        }

        if (!/^[\w-]+$/.test(videoId)) return null;

        return `https://www.youtube-nocookie.com/embed/${videoId}`;
    } catch {
        return null;
    }
}


function renderMedia(container, pin, mediaPosition) {
    container.replaceChildren();

    const hasVideo = Boolean(pin[7]);

    // The video occupies position 1, if present.
    if (hasVideo && mediaPosition === 1) {
        const embedUrl = getYoutubeEmbedUrl(pin[7]);

        if (!embedUrl) {
            container.textContent = "Invalid YouTube URL.";
            return;
        }

        const iframe = document.createElement("iframe");
        iframe.src = embedUrl;
        iframe.allowFullscreen = true;

        container.appendChild(iframe);
        return;
    }

    // Subtract one position for the video when determining the image.
    const imageIndex = mediaPosition - (hasVideo ? 2 : 1);
    const imageFile = pin[6][imageIndex];

    if (!imageFile) return;

    const img = document.createElement("img");
    img.src = `./images/${imageFile}`;
    img.alt = `${pin[0]}-${imageIndex + 1}`;
    img.addEventListener("click", openImageModal);

    container.appendChild(img);
}

function renderSidebarMedia() {
    const container = document.getElementById("sidebar-media");
    container.replaceChildren();

    if (!selectedPin) return;

    const images = selectedPin[6] || [];
    const imageCount = images.length;
    const videoUrl = selectedPin[7];

    if (currImg < 1 || currImg > getMediaCount(selectedPin)) {
        currImg = 1;
    }

    if (currImg <= imageCount) {
        // Display an image.
        const img = document.createElement("img");
        img.id = "sidebar-image";
        img.src = `images/${images[currImg - 1]}`;
        img.alt = `Pin ${selectedPin[0]} image ${currImg}`;
        img.style.cursor = "pointer";

        container.appendChild(img);
    } else if (videoUrl) {
        // Display the YouTube video after the images.
        const embedUrl = getYouTubeEmbedUrl(videoUrl);

        if (embedUrl) {
            const iframe = document.createElement("iframe");
            iframe.src = embedUrl;
            iframe.referrerPolicy = "strict-origin-when-cross-origin";

            container.appendChild(iframe);
        }
    }

    // Update the sidebar media counter and navigation.
    document.getElementById("curr-img").textContent = currImg;
    document.getElementById("total-img").textContent =
        getMediaCount(selectedPin);

    document.getElementById("previmg-button").disabled = currImg <= 1;
    document.getElementById("nextimg-button").disabled =
        currImg >= getMediaCount(selectedPin);
}

function prevImg() {
    if (!selectedPin || currImg <= 1) return;

    currImg--;
    renderSidebarMedia();
}

function nextImg() {
    if (!selectedPin || currImg >= getMediaCount(selectedPin)) return;

    currImg++;
    renderSidebarMedia();
}

// Mark pins as found or not found
function markFound(pin, button) {
    const foundCount = document.getElementById("found-count");
    const total = parseInt(document.getElementById("total-count").textContent, 10);

    let count = parseInt(foundCount.textContent, 10);

    if (pin[8] === "1") {
        pin[8] = "0";
        count--;

        button.textContent = "Mark as Found";
        button.classList.remove("found");

        showUnfoundMarker(pin);
    } else {
        pin[8] = "1";
        count++;

        button.textContent = "Mark as Not Found";
        button.classList.add("found");

        showFoundMarker(pin);
    }

    foundCount.textContent = count;
    document.getElementById("progress-fill").style.width =
        `${total ? (count / total) * 100 : 0}%`;

    map.closePopup();
}

function showUnfoundMarker(pin) {
    if (map.hasLayer(pin.marker)) {
        map.removeLayer(pin.marker);
    }

    if (!markerCluster.hasLayer(pin.marker)) {
        markerCluster.addLayer(pin.marker);
    }

    pin.marker.setOpacity(1);
    pin.marker.setZIndexOffset(0);
}

function showFoundMarker(pin) {
    if (markerCluster.hasLayer(pin.marker)) {
        markerCluster.removeLayer(pin.marker);
    }

    if (hideFound) {
        map.removeLayer(pin.marker);
    } else {
        pin.marker.setOpacity(0.4);
        pin.marker.setZIndexOffset(-1000);

        if (!map.hasLayer(pin.marker)) {
            pin.marker.addTo(map);
        }
    }
}

// Hide found markers
document.getElementById("hide-found-checkbox").addEventListener("change", function () {
    hideFound = this.checked;

    pins.forEach(function (pin) {
        if (pin[8] === "1") {
            showFoundMarker(pin);
        }
    });
});

// Image modal
const imageModal = document.getElementById("image-modal");
const modalMedia = document.getElementById("modal-media");
const modalClose = document.getElementById("modal-close");
const modalPrev = document.getElementById("modal-prev");
const modalNext = document.getElementById("modal-next");
const modalCounter = document.getElementById("modal-counter");

function updateModalImage() {
    if (!selectedPin) return;

    const images = selectedPin[6] || [];

    if (currImg < 1 || currImg > images.length) return;

    modalMedia.replaceChildren();

    const img = document.createElement("img");
    img.src = `images/${images[currImg - 1]}`;
    img.alt = `Pin ${selectedPin[0]} image ${currImg}`;

    modalMedia.appendChild(img);

    modalCounter.textContent = `${currImg} / ${images.length}`;
    modalPrev.disabled = currImg <= 1;
    modalNext.disabled = currImg >= images.length;
}

function openImageModal() {
    if (!selectedPin) return;

    const images = selectedPin[6] || [];

    if (currImg < 1 || currImg > images.length) return;

    updateModalImage();
    imageModal.classList.add("open");
    document.body.style.overflow = "hidden";
}

function closeImageModal() {
    imageModal.classList.remove("open");
    document.body.style.overflow = "";
    modalMedia.replaceChildren();
}

function modalPrevImg() {
    if (currImg <= 1) return;

    currImg--;
    renderSidebarMedia();
    updateModalImage();
}

function modalNextImg() {
    if (!selectedPin || currImg >= getMediaCount(selectedPin)) return;

    currImg++;
    renderSidebarMedia();
    updateModalImage();
}

modalClose.addEventListener("click", closeImageModal);
modalPrev.addEventListener("click", modalPrevImg);
modalNext.addEventListener("click", modalNextImg);

document.getElementById("sidebar-media").addEventListener("click", function (event) {
    if (event.target.tagName === "IMG") {
        openImageModal();
    }
});

imageModal.addEventListener("click", function (event) {
    if (event.target === imageModal) {
        closeImageModal();
    }
});

document.addEventListener("keydown", function (event) {
    if (!imageModal.classList.contains("open")) return;

    if (event.key === "Escape") closeImageModal();
    if (event.key === "ArrowLeft") modalPrevImg();
    if (event.key === "ArrowRight") modalNextImg();
});

loadPins();
