'use strict';

let selectedPin = null;
let hideFound = false;
let pins = [];
let currImg = 1;

var pinIcon = L.icon({
    iconUrl: 'icons/pin-icon.png',
    iconSize: [30, 44],
    iconAnchor: [15, 44],
    popupAnchor: [0, -44]
})


// pin#, name, location, description, lat/lon, # of images
function csvToArray(data) {
    const result = Papa.parse(data).data;
    return result.map(pin => {
        const coordinates = pin[4].replace(/[\[\]\(\)\s]/g, "").split(",");
        pin.splice(4, 1, parseFloat(coordinates[0]), parseFloat(coordinates[1]))
        return pin;
    });
}

function populatePins(pins) {

    pins.forEach(function (pin) {

        const marker = L.marker([pin[4], pin[5]], { icon: pinIcon }, { riseOnHover: true }).addTo(map);

        pin.marker = marker;

        var popupContent = `
            <div id="popup">
                <h3>Sighting #${pin[0]}</h3>
                <button class='found-button' id=button${pin[0]} style="cursor:pointer; padding: 5px 10px;">${pin[7] === "1" ? "Mark as Not Found" : "Mark as Found"}</button>
            </div>
        `;

        marker.bindPopup(popupContent);

        marker.on('popupopen', function () {

            const button = document.getElementById(`button${pin[0]}`);

            if (pin[7] === "1") {
                button.textContent = "Mark as Not Found";
                button.classList.add("found");
            } else {
                button.textContent = "Mark as Found";
                button.classList.remove("found");
            }

            button.addEventListener('click', function () {
                markFound(pin, button);
            });

            if (pin[7] === "1") {
                button.classList.add("found");
            }
        });

        marker.on('click', function () {

            selectedPin = pin;
            updateSidebar(pin);

            if (map.getZoom() < 4) {
                map.panTo([pin[4], pin[5]], { duration: 0.5, easeLinearity: 0.25 });
            }
        });
    });

    document.getElementById("total-count").textContent = pins.length;

}

function loadPins() {
    fetch('locations.csv')
        .then(response => response.text())
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
    const imageSwitcher = document.getElementById("sidebar-image-switcher");
    const sidebarImage = document.getElementById("sidebar-image");

    document.getElementById("sidebar-title").textContent = `Mocha Sighting #${pin[0]}`;
    document.getElementById("sidebar-username").textContent = (pin[1] == "" ? `Submitted by Anonymous` : `Submitted by ${pin[1]}`);
    sidebarImage.src = `./images/${pin[0]}-1.jpg`;
    sidebarImage.style.display = "block";

    // Image switching fields; start at image 1/x
    imageSwitcher.style.display = "flex";
    currImg = 1;
    document.getElementById("curr-img").textContent = 1;
    document.getElementById('previmg-button').disabled = true;
    document.getElementById('nextimg-button').disabled = (currImg < selectedPin[6]) ? false : true;
    document.getElementById('total-img').textContent = `${pin[6]}`;

    if (pin[4] !== "") {
        locationIcon.style.display = "flex";
    } else {
        locationIcon.style.display = "none";
    }

    document.getElementById("sidebar-location-text").textContent = pin[2];
    document.getElementById("sidebar-description").textContent = pin[3];
}

// Handles prev image switching
function prevImg() {
    if (currImg > 1) {
        currImg -= 1;
        document.getElementById("curr-img").textContent = currImg;
        document.getElementById("sidebar-image").src = `./images/${selectedPin[0]}-${currImg}.jpg`;

        // Disable at first image
        if (currImg == 1) {
            document.getElementById('previmg-button').disabled = true;
        }

        // Enable next button when switched
        document.getElementById('nextimg-button').disabled = false;
    }
}

// Handles next image switching
function nextImg() {
    if (currImg < selectedPin[6]) {
        currImg += 1;
        document.getElementById("curr-img").textContent = currImg;
        document.getElementById("sidebar-image").src = `./images/${selectedPin[0]}-${currImg}.jpg`;

        // Disable when at last image
        if (currImg == selectedPin[6]) {
            document.getElementById('nextimg-button').disabled = true;
        }

        // Enable previous button when switched
        document.getElementById('previmg-button').disabled = false;
    }
}

// Functionality for toggling pins as found/not found
function markFound(pin, button) {

    const foundCount = document.getElementById("found-count");
    const totalCount = document.getElementById("total-count");

    let count = parseInt(foundCount.textContent, 10);
    let total = parseInt(totalCount.textContent, 10);

    if (pin[7] === "1") {
        pin[7] = "0";
        button.textContent = "Mark as Found";
        button.classList.remove("found");
        count -= 1;
        pin.marker.setOpacity(1);
    } else {
        pin[7] = "1";
        button.textContent = "Mark as Not Found";
        button.classList.add("found");
        count += 1;
        pin.marker.setOpacity(0.4);
    }

    // Map completion bar for pins marked as found
    foundCount.textContent = count;

    const progressFill = document.getElementById("progress-fill");
    progressFill.style.width = `${(count / total) * 100}%`;

    map._fadeAnimated = false;
    if (hideFound) { map.removeLayer(pin.marker); }
    map.closePopup();
    map._fadeAnimated = true;
}

// Hide found markers handler
document.getElementById("hide-found-checkbox").addEventListener("change", function () {
    hideFound = this.checked;

    pins.forEach(function (pin) {
        if (pin[7] === "1" && hideFound) {
            map.removeLayer(pin.marker);
        } else {
            map.addLayer(pin.marker);
        }
    });
});

loadPins();