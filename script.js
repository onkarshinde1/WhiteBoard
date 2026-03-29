const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });

// Set canvas size to full screen
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    // Restore drawing after resize
    if (history.length > 0 && historyStep >= 0) {
        const img = new Image();
        img.src = history[historyStep];
        img.onload = () => {
            ctx.drawImage(img, 0, 0);
        };
    }
}

// Initial sizing
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Fill with transparent background initially
function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// Initial background
clearCanvas();

// Tool states
let currentTool = 'pen';
let isDrawing = false;
let color = '#000000';
let lineWidth = 3;
let opacity = 1;

// History for undo/redo
let history = [];
let historyStep = -1;

// Get toolbar elements
const penBtn = document.getElementById('penBtn');
const highlighterBtn = document.getElementById('highlighterBtn');
const eraserBtn = document.getElementById('eraserBtn');
const pointerBtn = document.getElementById('pointerBtn');
const colorPicker = document.getElementById('colorPicker');
const sizeSlider = document.getElementById('sizeSlider');
const sizeDisplay = document.getElementById('sizeDisplay');
const opacitySlider = document.getElementById('opacitySlider');
const opacityDisplay = document.getElementById('opacityDisplay');
const clearBtn = document.getElementById('clearBtn');
const undoBtn = document.getElementById('undoBtn');
const redoBtn = document.getElementById('redoBtn');
const downloadBtn = document.getElementById('downloadBtn');

// Tool buttons
const toolButtons = [penBtn, highlighterBtn, eraserBtn, pointerBtn];

function setActiveTool(button) {
    toolButtons.forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
}

penBtn.addEventListener('click', () => {
    currentTool = 'pen';
    setActiveTool(penBtn);
    canvas.style.cursor = 'crosshair';
    ctx.globalCompositeOperation = 'source-over';
});

highlighterBtn.addEventListener('click', () => {
    currentTool = 'highlighter';
    setActiveTool(highlighterBtn);
    canvas.style.cursor = 'crosshair';
    ctx.globalCompositeOperation = 'source-over';
});

eraserBtn.addEventListener('click', () => {
    currentTool = 'eraser';
    setActiveTool(eraserBtn);
    canvas.style.cursor = 'cell';
    ctx.globalCompositeOperation = 'destination-out'; // Erase to fully transparent
});

pointerBtn.addEventListener('click', () => {
    currentTool = 'pointer';
    setActiveTool(pointerBtn);
    canvas.style.cursor = 'default';
});

colorPicker.addEventListener('input', (e) => {
    color = e.target.value;
    if (currentTool === 'eraser' || currentTool === 'pointer') {
        currentTool = 'pen';
        setActiveTool(penBtn);
        canvas.style.cursor = 'crosshair';
        ctx.globalCompositeOperation = 'source-over';
    }
});

sizeSlider.addEventListener('input', (e) => {
    lineWidth = e.target.value;
    sizeDisplay.textContent = lineWidth;
});

opacitySlider.addEventListener('input', (e) => {
    opacity = e.target.value;
    opacityDisplay.textContent = Math.round(opacity * 100) + '%';
});

clearBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear the canvas?')) {
        clearCanvas();
        saveState();
    }
});

undoBtn.addEventListener('click', () => {
    if (historyStep > 0) {
        historyStep--;
        const img = new Image();
        img.src = history[historyStep];
        img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
        };
    }
});

redoBtn.addEventListener('click', () => {
    if (historyStep < history.length - 1) {
        historyStep++;
        const img = new Image();
        img.src = history[historyStep];
        img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
        };
    }
});

downloadBtn.addEventListener('click', () => {
    // Create a temporary canvas to draw the background and the current drawing
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');

    // Draw white background
    tempCtx.fillStyle = '#ffffff';
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

    // Draw dot grid
    tempCtx.fillStyle = '#e2e8f0';
    const dotSpacing = 30;
    const dotRadius = 1.5;

    for (let x = dotSpacing; x < tempCanvas.width; x += dotSpacing) {
        for (let y = dotSpacing; y < tempCanvas.height; y += dotSpacing) {
            tempCtx.beginPath();
            tempCtx.arc(x, y, dotRadius, 0, Math.PI * 2);
            tempCtx.fill();
        }
    }

    // Draw the actual drawing on top
    tempCtx.drawImage(canvas, 0, 0);

    const link = document.createElement('a');
    link.download = 'whiteboard.png';
    link.href = tempCanvas.toDataURL('image/png');
    link.click();
});

function saveState() {
    historyStep++;
    if (historyStep < history.length) {
        history.length = historyStep;
    }
    history.push(canvas.toDataURL());
}

// Drawing functions
function getPointerPos(e) {
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }

    return {
        x: clientX - rect.left,
        y: clientY - rect.top
    };
}

function startDrawing(e) {
    if (currentTool === 'pointer') return;
    // Don't draw if target is toolbar or its children
    if (e.target.closest('.toolbar')) return;

    isDrawing = true;
    const pos = getPointerPos(e);

    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);

    if (currentTool === 'eraser') {
        ctx.globalAlpha = 1; // Eraser shouldn't be transparent
        ctx.strokeStyle = '#ffffff'; // Draw with white background color
        ctx.lineWidth = lineWidth;
    } else if (currentTool === 'highlighter') {
        ctx.globalAlpha = opacity * 0.4;
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth * 2.5;
    } else {
        ctx.globalAlpha = opacity;
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
    }

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Draw a single dot if user just clicks
    draw(e);
}

function draw(e) {
    if (!isDrawing || currentTool === 'pointer') return;

    const pos = getPointerPos(e);

    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();

    // For smoother lines, move to the new position
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
}

function stopDrawing() {
    if (isDrawing) {
        isDrawing = false;
        ctx.closePath();
        saveState();
    }
}

// Event listeners for Mouse
canvas.addEventListener('mousedown', startDrawing);
window.addEventListener('mousemove', draw);
window.addEventListener('mouseup', stopDrawing);

// Event listeners for Touch
canvas.addEventListener('touchstart', (e) => {
    if (e.target.closest('.toolbar')) return; // Allow toolbar interactions normally
    e.preventDefault(); // Prevent scrolling
    startDrawing(e);
}, { passive: false });

window.addEventListener('touchmove', (e) => {
    if (isDrawing) {
        e.preventDefault(); // Prevent scrolling while drawing
        draw(e);
    }
}, { passive: false });

window.addEventListener('touchend', (e) => {
    stopDrawing();
});

// Initialize history
// Small delay to ensure canvas is fully rendered before taking initial snapshot
setTimeout(() => {
    saveState();
}, 100);

// Handle window resize
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(resizeCanvas, 200);
});