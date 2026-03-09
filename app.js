/**
 * AI Celebrity Face Match — LIFF Frontend Application
 * Handles camera/upload, API communication, and results display.
 */

// ============================================
// CONFIG
// ============================================
const CONFIG = {
    // Replace with your actual LIFF ID from LINE Developers Console
    LIFF_ID: '2009372248-15peGyA9',
    API_BASE: window.location.origin,
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
};

// ============================================
// STATE
// ============================================
const state = {
    selectedFile: null,
    userImageDataUrl: null,
    liffInitialized: false,
    isAnalyzing: false,
};

// ============================================
// DOM REFERENCES
// ============================================
const $ = (id) => document.getElementById(id);

const screens = {
    home: $('screen-home'),
    upload: $('screen-upload'),
    loading: $('screen-loading'),
    results: $('screen-results'),
};

const elements = {
    btnStart: $('btn-start'),
    btnBack: $('btn-back'),
    btnCamera: $('btn-camera'),
    btnGallery: $('btn-gallery'),
    btnAnalyze: $('btn-analyze'),
    btnShare: $('btn-share'),
    btnRetry: $('btn-retry'),
    btnRemove: $('btn-remove'),
    btnErrorClose: $('btn-error-close'),
    fileInput: $('file-input'),
    uploadArea: $('upload-area'),
    previewSection: $('preview-section'),
    previewImage: $('preview-image'),
    errorModal: $('error-modal'),
    errorTitle: $('error-title'),
    errorMessage: $('error-message'),
    resultUserImg: $('result-user-img'),
    resultCelebImg: $('result-celeb-img'),
    resultCelebName: $('result-celeb-name'),
    resultSimilarity: $('result-similarity'),
    resultBar: $('result-bar'),
    matchList: $('match-list'),
    particles: $('particles'),
};

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    initLIFF();
    initParticles();
    bindEvents();
});

async function initLIFF() {
    try {
        await liff.init({ liffId: CONFIG.LIFF_ID });
        state.liffInitialized = true;
        console.log('LIFF initialized:', liff.isInClient() ? 'in-client' : 'external');
    } catch (err) {
        console.warn('LIFF init failed (running standalone):', err.message);
        state.liffInitialized = false;
    }
}

function initParticles() {
    const container = elements.particles;
    if (!container) return;
    for (let i = 0; i < 20; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        p.style.left = Math.random() * 100 + '%';
        p.style.animationDelay = Math.random() * 6 + 's';
        p.style.animationDuration = (4 + Math.random() * 4) + 's';
        p.style.background = Math.random() > 0.5 ? '#a855f7' : '#ec4899';
        p.style.width = p.style.height = (2 + Math.random() * 4) + 'px';
        container.appendChild(p);
    }
}

// ============================================
// EVENT BINDING
// ============================================
function bindEvents() {
    // Navigation
    elements.btnStart.addEventListener('click', () => showScreen('upload'));
    elements.btnBack.addEventListener('click', () => showScreen('home'));
    elements.btnRetry.addEventListener('click', () => {
        resetState();
        showScreen('upload');
    });

    // File input
    elements.btnCamera.addEventListener('click', () => {
        elements.fileInput.setAttribute('capture', 'user');
        elements.fileInput.click();
    });

    elements.btnGallery.addEventListener('click', () => {
        elements.fileInput.removeAttribute('capture');
        elements.fileInput.click();
    });

    elements.uploadArea.addEventListener('click', () => {
        elements.fileInput.removeAttribute('capture');
        elements.fileInput.click();
    });

    elements.fileInput.addEventListener('change', handleFileSelect);

    // Drag & drop
    elements.uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        elements.uploadArea.classList.add('dragover');
    });

    elements.uploadArea.addEventListener('dragleave', () => {
        elements.uploadArea.classList.remove('dragover');
    });

    elements.uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        elements.uploadArea.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            processFile(e.dataTransfer.files[0]);
        }
    });

    // Actions
    elements.btnRemove.addEventListener('click', resetPreview);
    elements.btnAnalyze.addEventListener('click', analyzePhoto);
    elements.btnShare.addEventListener('click', shareResult);

    // Modal
    elements.btnErrorClose.addEventListener('click', () => {
        elements.errorModal.classList.add('hidden');
    });
}

// ============================================
// SCREEN MANAGEMENT
// ============================================
function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[name].classList.add('active');
    window.scrollTo(0, 0);
}

// ============================================
// FILE HANDLING
// ============================================
function handleFileSelect(e) {
    if (e.target.files && e.target.files.length > 0) {
        processFile(e.target.files[0]);
    }
}

function processFile(file) {
    // Validate
    if (!file.type.startsWith('image/')) {
        showError('無効なファイル', '画像ファイルを選択してください。');
        return;
    }

    if (file.size > CONFIG.MAX_FILE_SIZE) {
        showError('ファイルサイズ超過', 'ファイルサイズが10MBを超えています。');
        return;
    }

    state.selectedFile = file;

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
        state.userImageDataUrl = e.target.result;
        elements.previewImage.src = e.target.result;
        elements.previewSection.classList.remove('hidden');
        elements.uploadArea.style.display = 'none';
        elements.uploadArea.nextElementSibling.style.display = 'none'; // hide options
    };
    reader.readAsDataURL(file);
}

function resetPreview() {
    state.selectedFile = null;
    state.userImageDataUrl = null;
    elements.previewSection.classList.add('hidden');
    elements.uploadArea.style.display = '';
    const uploadOptions = document.querySelector('.upload-options');
    if (uploadOptions) uploadOptions.style.display = '';
    elements.fileInput.value = '';
}

function resetState() {
    resetPreview();
    state.isAnalyzing = false;
}

// ============================================
// ANALYSIS
// ============================================
async function analyzePhoto() {
    if (!state.selectedFile || state.isAnalyzing) return;
    state.isAnalyzing = true;

    // Show loading screen
    showScreen('loading');
    startLoadingAnimation();

    try {
        const formData = new FormData();
        formData.append('file', state.selectedFile);

        const response = await fetch(`${CONFIG.API_BASE}/api/analyze`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json();

        if (!data.success) {
            showError('分析エラー', data.error || '顔の検出に失敗しました。');
            showScreen('upload');
            state.isAnalyzing = false;
            return;
        }

        // Show results
        displayResults(data.results);

    } catch (err) {
        console.error('Analysis failed:', err);
        showError(
            '通信エラー',
            'サーバーとの通信に失敗しました。もう一度お試しください。'
        );
        showScreen('upload');
    } finally {
        state.isAnalyzing = false;
    }
}

// ============================================
// LOADING ANIMATION
// ============================================
function startLoadingAnimation() {
    const steps = ['step-1', 'step-2', 'step-3', 'step-4'];
    let current = 0;

    // Reset all steps
    steps.forEach(id => {
        const el = $(id);
        el.classList.remove('active', 'done');
    });
    $(steps[0]).classList.add('active');

    const interval = setInterval(() => {
        if (current < steps.length) {
            $(steps[current]).classList.remove('active');
            $(steps[current]).classList.add('done');
        }
        current++;
        if (current < steps.length) {
            $(steps[current]).classList.add('active');
        } else {
            clearInterval(interval);
        }
    }, 800);
}

// ============================================
// RESULTS DISPLAY
// ============================================
function displayResults(results) {
    if (!results || results.length === 0) {
        showError('結果なし', '一致する有名人が見つかりませんでした。');
        showScreen('upload');
        return;
    }

    const topMatch = results[0];

    // Set user image
    if (state.userImageDataUrl) {
        elements.resultUserImg.src = state.userImageDataUrl;
    }

    // Set top celebrity image
    elements.resultCelebImg.src = topMatch.image_url;
    elements.resultCelebImg.onerror = () => {
        elements.resultCelebImg.src = createPlaceholderImage(topMatch.display_name);
    };
    elements.resultCelebName.textContent = topMatch.display_name;

    // Animate similarity number
    showScreen('results');

    setTimeout(() => {
        animateNumber(elements.resultSimilarity, topMatch.similarity, 1500);
        elements.resultBar.style.width = topMatch.similarity + '%';
    }, 300);

    // Populate match list
    elements.matchList.innerHTML = '';
    results.forEach((match, index) => {
        const item = document.createElement('div');
        item.className = 'match-item';
        item.innerHTML = `
            <div class="match-rank">${index + 1}</div>
            <img class="match-item-thumb" 
                 src="${match.image_url}" 
                 alt="${match.display_name}"
                 onerror="this.src='${createPlaceholderImage(match.display_name)}'">
            <div class="match-item-info">
                <div class="match-item-name">${match.display_name}</div>
                <div class="match-item-bar-bg">
                    <div class="match-item-bar" style="width: 0%"></div>
                </div>
            </div>
            <div class="match-item-pct">${match.similarity}%</div>
        `;
        elements.matchList.appendChild(item);

        // Animate bars
        setTimeout(() => {
            const bar = item.querySelector('.match-item-bar');
            if (bar) bar.style.width = match.similarity + '%';
        }, 500 + index * 150);
    });
}

function animateNumber(element, target, duration) {
    const start = 0;
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = start + (target - start) * eased;
        element.textContent = current.toFixed(1);
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    requestAnimationFrame(update);
}

function createPlaceholderImage(name) {
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');

    // Gradient background
    const gradient = ctx.createLinearGradient(0, 0, 100, 100);
    gradient.addColorStop(0, '#667eea');
    gradient.addColorStop(1, '#764ba2');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 100, 100);

    // First character
    ctx.fillStyle = 'white';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const initial = name ? name.charAt(0).toUpperCase() : '?';
    ctx.fillText(initial, 50, 50);

    return canvas.toDataURL();
}

// ============================================
// SHARING (LINE 4-Level Fallback)
// ============================================
async function shareResult() {
    const topName = elements.resultCelebName.textContent;
    const similarity = elements.resultSimilarity.textContent;
    const shareText = `🌟 StarFace AI有名人顔診断の結果！\n\n私に最も似ている有名人は「${topName}」（類似度${similarity}%）でした！\n\n1,800人以上の有名人から診断👇`;
    const shareUrl = window.location.href;

    // Level 1: shareTargetPicker (LIFF)
    if (state.liffInitialized && liff.isApiAvailable('shareTargetPicker')) {
        try {
            await liff.shareTargetPicker([
                {
                    type: 'text',
                    text: shareText + '\n' + shareUrl,
                },
            ]);
            return;
        } catch (err) {
            console.warn('shareTargetPicker failed:', err);
        }
    }

    // Level 2: sendMessages (in-client)
    if (state.liffInitialized && liff.isInClient() && liff.isApiAvailable('sendMessages')) {
        try {
            await liff.sendMessages([
                {
                    type: 'text',
                    text: shareText + '\n' + shareUrl,
                },
            ]);
            return;
        } catch (err) {
            console.warn('sendMessages failed:', err);
        }
    }

    // Level 3: navigator.share (Web Share API)
    if (navigator.share) {
        try {
            await navigator.share({
                title: 'AI 有名人顔診断',
                text: shareText,
                url: shareUrl,
            });
            return;
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.warn('Web Share failed:', err);
            } else {
                return; // User cancelled
            }
        }
    }

    // Level 4: Clipboard fallback
    try {
        await navigator.clipboard.writeText(shareText + '\n' + shareUrl);
        showToast('結果をコピーしました！');
    } catch (err) {
        console.warn('Clipboard failed:', err);
    }
}

// ============================================
// ERROR HANDLING
// ============================================
function showError(title, message) {
    elements.errorTitle.textContent = title;
    elements.errorMessage.textContent = message;
    elements.errorModal.classList.remove('hidden');
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 40px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(16, 185, 129, 0.9);
        color: white;
        padding: 12px 24px;
        border-radius: 12px;
        font-size: 0.85rem;
        font-weight: 600;
        z-index: 200;
        animation: slideUp 0.3s ease, fadeIn 0.3s ease;
        backdrop-filter: blur(4px);
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}
