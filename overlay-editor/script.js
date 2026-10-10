const imageInput = document.getElementById("image-input");
const cropContainer = document.getElementById("crop-container");

const userImage = document.getElementById("user-image");
const backgroundImage = document.getElementById("background-image");
const topOverlay = document.getElementById("top-overlay");

const downloadButton = document.getElementById("download-button");

let imageLoaded = false;

let scale = 1;

let x = 0;
let y = 0;

let activeBackground = "bg1";
let activeEvent = "anni";
let activeOutfit = "base";

// Dragging

let isDragging = false;

let dragStartX = 0;
let dragStartY = 0;

let imageStartX = 0;
let imageStartY = 0;

// Image upload
imageInput.addEventListener("change", function () {

    const file = this.files[0];

    if (!file) {
        return;
    }

    const url = URL.createObjectURL(file);

    userImage.onload = function () {
        imageLoaded = true;
        resetImage();
        downloadButton.disabled = false;

        URL.revokeObjectURL(url);
    };

    userImage.src = url;
});

function resetImage() {

    if (!imageLoaded) {
        return;
    }

    const containerSize = 512;

    const imageWidth = userImage.naturalWidth;
    const imageHeight = userImage.naturalHeight;

    const coverScale = Math.max(containerSize / imageWidth, containerSize / imageHeight);
    scale = coverScale;

    const displayedWidth = imageWidth * scale;
    const displayedHeight = imageHeight * scale;

    x = (containerSize - displayedWidth) / 2;
    y = (containerSize - displayedHeight) / 2;

    updateImage();
}

function updateImage() {

    userImage.style.width =
        `${userImage.naturalWidth * scale}px`;

    userImage.style.height =
        `${userImage.naturalHeight * scale}px`;

    userImage.style.left = `${x}px`;
    userImage.style.top = `${y}px`;
}

// Zoom
cropContainer.addEventListener("wheel", function (event) {

    if (!imageLoaded) {
        return;
    }

    event.preventDefault();

    const rect = cropContainer.getBoundingClientRect();
    const mouseX = (event.clientX - rect.left) * (512 / rect.width);
    const mouseY = (event.clientY - rect.top) * (512 / rect.height);
    const oldScale = scale;

    let zoomFactor;

    if (event.deltaY < 0) {
        zoomFactor = 1.1;
    } else {
        zoomFactor = 0.9;
    }

    const imageWidth = userImage.naturalWidth;
    const imageHeight = userImage.naturalHeight;

    const minimumScale = Math.max(512 / imageWidth, 512 / imageHeight) * 0.25;
    const maximumScale = minimumScale * 1000;

    scale *= zoomFactor;
    scale = Math.max(minimumScale, Math.min(maximumScale, scale));

    x = mouseX - (mouseX - x) * (scale / oldScale);
    y = mouseY - (mouseY - y) * (scale / oldScale);

    updateImage();

}, {
    passive: false
});

// Drag image
cropContainer.addEventListener("mousedown", function (event) {

    if (!imageLoaded) {
        return;
    }

    isDragging = true;

    dragStartX = event.clientX;
    dragStartY = event.clientY;

    imageStartX = x;
    imageStartY = y;

});


document.addEventListener("mousemove", function (event) {

    if (!isDragging) {
        return;
    }

    const rect = cropContainer.getBoundingClientRect();
    const deltaX = (event.clientX - dragStartX) * (512 / rect.width);
    const deltaY = (event.clientY - dragStartY) * (512 / rect.height);

    x = imageStartX + deltaX;
    y = imageStartY + deltaY;

    updateImage();

});

document.addEventListener("mouseup", function () {
    isDragging = false;
});

cropContainer.addEventListener("pointercancel", function (event) {

    activePointers.delete(event.pointerId);

    if (activePointers.size < 2) {
        pinchStartDistance = 0;
    }

    if (activePointers.size === 0) {
        isDragging = false;
    }
});

const backgroundOptions =
    document.querySelectorAll(".selection-option");

backgroundOptions.forEach(function (button) {

    button.addEventListener("click", function () {

        activeBackground = this.dataset.background;

        if (activeBackground != "no-bg") {
            backgroundImage.style.display = "inline";
            backgroundImage.src = ` ./icons/${activeBackground}.png`;

            backgroundOptions.forEach(function (option) {
                option.classList.remove("selected");
            });
        } else {
            backgroundImage.style.display = "none";

            backgroundOptions.forEach(function (option) {
                option.classList.remove("selected");
            });
        }


        this.classList.add("selected");
    });
});

const eventOptions = document.querySelectorAll("[data-event]");

eventOptions.forEach(function (button) {

    button.addEventListener("click", function () {

        activeEvent = this.dataset.event;

        eventOptions.forEach(function (option) {
            option.classList.remove("selected");
        });

        this.classList.add("selected");

        updateTopOverlay();
    });
});

const outfitOptions = document.querySelectorAll("[data-outfit]");

outfitOptions.forEach(function (button) {

    button.addEventListener("click", function () {

        activeOutfit = this.dataset.outfit;

        outfitOptions.forEach(function (option) {
            option.classList.remove("selected");
        });

        this.classList.add("selected");

        updateTopOverlay();
    });
});


function updateTopOverlay() {
    topOverlay.style.display = "block";
    const filename = `${activeEvent}-${activeOutfit}.png`;
    topOverlay.src = ` ./icons/${filename}`;
}

downloadButton.addEventListener("click", function () {

    if (!imageLoaded) {
        return;
    }

    const canvas = document.createElement("canvas");

    canvas.width = 512;
    canvas.height = 512;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(userImage, x, y, userImage.naturalWidth * scale, userImage.naturalHeight * scale);
    ctx.drawImage(backgroundImage, 0, 0, 512, 512);
    ctx.drawImage(topOverlay, 0, 0, 512, 512);

    // write to png
    canvas.toBlob(function (blob) {

        if (!blob) {
            return;
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "profile-picture.png";
        document.body.appendChild(link);

        link.click();
        link.remove();

        URL.revokeObjectURL(url);

    }, "image/png");

});

updateTopOverlay();