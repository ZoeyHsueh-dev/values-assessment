// 職涯價值觀測驗系統 - JavaScript檔案

// 全域變數
let valuesData = [];
let categoryMapping = {};
let systemConfig = {};
let selectedValues = [];
let finalRanking = [];
let currentPhase = 'loading';

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    loadSystemData();
});

async function loadSystemData() {
    try {
        // 載入系統設定
        const configResponse = await fetch('./config.json');
        systemConfig = await configResponse.json();

        // 載入價值觀資料
        const valuesResponse = await fetch('./values-data.json');
        const valuesDataObj = await valuesResponse.json();
        
        valuesData = valuesDataObj.values;
        categoryMapping = valuesDataObj.categories;
        
        // 更新頁面標題和描述
        document.getElementById('systemTitle').textContent = systemConfig.system.title;
        document.getElementById('systemDescription').textContent = systemConfig.system.description;
        
        // 載入完成後初始化
        document.getElementById('loadingSection').classList.add('hidden');
        document.getElementById('loginSection').classList.remove('hidden');
        initializeEventListeners();
        renderValueCards();
        
    } catch (error) {
        console.error('載入系統資料失敗:', error);
        document.getElementById('loadingSection').innerHTML = 
            '<div class="error-message">載入失敗，請重新整理頁面</div>';
    }
}

function initializeEventListeners() {
    document.getElementById('startBtn').addEventListener('click', validateCode);
    document.getElementById('nextBtn').addEventListener('click', proceedToNextPhase);
    document.getElementById('rankBtn').addEventListener('click', startRanking);
    document.getElementById('submitBtn').addEventListener('click', submitResults);
    document.getElementById('restartBtn').addEventListener('click', restartAssessment);
    document.getElementById('codeInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') validateCode();
    });
}

function validateCode() {
    const inputCode = document.getElementById('codeInput').value.toUpperCase();
    const validCode = systemConfig.access.code.toUpperCase();
    
    if (inputCode === validCode) {
        startAssessment();
    } else {
        showError('代碼錯誤，請重新輸入');
    }
}

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
    setTimeout(() => errorDiv.classList.add('hidden'), 3000);
}

function startAssessment() {
    currentPhase = 'selection';
    document.getElementById('loginSection').classList.add('hidden');
    document.getElementById('selectionSection').classList.remove('hidden');
}

function renderValueCards() {
    const container = document.getElementById('cardsGrid');
    container.innerHTML = '';
    
    // 如果設定要隨機化，就打亂順序
    let dataToRender = valuesData;
    if (systemConfig.settings.randomizeCards) {
        dataToRender = shuffleArray([...valuesData]);
    }
    
    dataToRender.forEach((value, displayIndex) => {
        // 找到原始索引
        const originalIndex = valuesData.findIndex(v => v.text === value.text);
        
        const card = document.createElement('div');
        card.className = `value-card ${categoryMapping[value.category].color}`;
        card.textContent = value.text;
        card.dataset.index = originalIndex;
        card.addEventListener('click', () => toggleSelection(originalIndex));
        container.appendChild(card);
    });
}

function toggleSelection(index) {
    const card = document.querySelector(`[data-index="${index}"]`);
    const isSelected = selectedValues.includes(index);
    
    if (isSelected) {
        selectedValues = selectedValues.filter(i => i !== index);
        card.classList.remove('selected');
    } else {
        selectedValues.push(index);
        card.classList.add('selected');
    }
    
    updateSelectionCounter();
}

function updateSelectionCounter() {
    document.getElementById('selectedCount').textContent = selectedValues.length;
    document.getElementById('nextBtn').disabled = selectedValues.length < systemConfig.settings.minSelection;
}

function proceedToNextPhase() {
    if (selectedValues.length === systemConfig.settings.finalSelection) {
        startRanking();
    } else {
        showReductionPhase();
    }
}

function showReductionPhase() {
    currentPhase = 'reduction';
    if (finalRanking.length > 0) {
        selectedValues = [...finalRanking];
    }
    finalRanking = [];
    document.getElementById('selectionSection').classList.add('hidden');
    document.getElementById('reductionSection').classList.remove('hidden');
    renderSelectedCards();
}

function renderSelectedCards() {
    const container = document.getElementById('selectedCards');
    container.innerHTML = '';
    
    selectedValues.forEach(index => {
        const value = valuesData[index];
        const card = document.createElement('div');
        card.className = `value-card ${categoryMapping[value.category].color}`;
        card.textContent = value.text;
        card.dataset.index = index;
        card.addEventListener('click', () => toggleReduction(index));
        container.appendChild(card);
    });
    
    updateReductionCounter();
}

function toggleReduction(index) {
    const card = document.querySelector(`#selectedCards [data-index="${index}"]`);
    const isSelected = card.classList.contains('selected');
    
    if (isSelected) {
        card.classList.remove('selected');
        finalRanking = finalRanking.filter(i => i !== index);
    } else {
        card.classList.add('selected');
        finalRanking.push(index);
    }
    
    updateReductionCounter();
}

function updateReductionCounter() {
    document.getElementById('reducedCount').textContent = finalRanking.length;
    
    const rankBtn = document.getElementById('rankBtn');
    if (finalRanking.length === systemConfig.settings.finalSelection) {
        rankBtn.disabled = false;
        rankBtn.textContent = '開始排序';
    } else if (finalRanking.length > systemConfig.settings.finalSelection) {
        rankBtn.disabled = false;
        rankBtn.textContent = '下一輪選擇';
    } else {
        rankBtn.disabled = true;
        rankBtn.textContent = `請選擇至少${systemConfig.settings.finalSelection}個`;
    }
}

function startRanking() {
    if (currentPhase === 'selection') {
        finalRanking = [...selectedValues];
    }
    
    if (finalRanking.length > systemConfig.settings.finalSelection) {
        showReductionPhase();
        return;
    }
    
    currentPhase = 'ranking';
    document.getElementById('selectionSection').classList.add('hidden');
    document.getElementById('reductionSection').classList.add('hidden');
    document.getElementById('rankingSection').classList.remove('hidden');
    renderRankingCards();
}

function renderRankingCards() {
    const container = document.getElementById('rankingArea');
    container.innerHTML = '';
    
    finalRanking.forEach((index, position) => {
        const value = valuesData[index];
        const card = document.createElement('div');
        card.className = `ranking-card ${categoryMapping[value.category].color}`;
        card.draggable = true;
        card.dataset.index = index;
        
        card.innerHTML = `
            <div class="ranking-number">${position + 1}</div>
            <div style="flex: 1; text-align: center; font-size: 1.1em;">${value.text}</div>
            <div style="width: 30px;"></div>
        `;
        
        setupDragAndDrop(card);
        container.appendChild(card);
    });
}

function setupDragAndDrop(card) {
    card.addEventListener('dragstart', handleDragStart);
    card.addEventListener('dragover', handleDragOver);
    card.addEventListener('drop', handleDrop);
    card.addEventListener('dragend', handleDragEnd);
}

let draggedElement = null;

function handleDragStart(e) {
    draggedElement = this;
    this.classList.add('dragging');
}

function handleDragOver(e) {
    e.preventDefault();
}

function handleDrop(e) {
    e.preventDefault();
    if (draggedElement !== this) {
        const container = document.getElementById('rankingArea');
        const allCards = Array.from(container.children);
        const draggedIndex = allCards.indexOf(draggedElement);
        const targetIndex = allCards.indexOf(this);
        
        if (draggedIndex < targetIndex) {
            container.insertBefore(draggedElement, this.nextSibling);
        } else {
            container.insertBefore(draggedElement, this);
        }
        
        updateRankingNumbers();
        updateFinalRanking();
    }
}

function handleDragEnd() {
    this.classList.remove('dragging');
    draggedElement = null;
}

function updateRankingNumbers() {
    const cards = document.querySelectorAll('.ranking-card');
    cards.forEach((card, index) => {
        const numberElement = card.querySelector('.ranking-number');
        numberElement.textContent = index + 1;
    });
}

function updateFinalRanking() {
    const cards = document.querySelectorAll('.ranking-card');
    finalRanking = Array.from(cards).map(card => parseInt(card.dataset.index));
}

function submitResults() {
    currentPhase = 'results';
    document.getElementById('rankingSection').classList.add('hidden');
    document.getElementById('resultsSection').classList.remove('hidden');
    displayResults();
}

function displayResults() {
    // 顯示前三名
    const topThreeContainer = document.getElementById('topThree');
    topThreeContainer.innerHTML = '';
    
    for (let i = 0; i < 3; i++) {
        const valueIndex = finalRanking[i];
        const value = valuesData[valueIndex];
        const card = document.createElement('div');
        card.className = `top-card rank-${i + 1}`;
        card.innerHTML = `
            <div style="font-size: 1.5em; font-weight: bold; margin-bottom: 10px;">第${i + 1}名</div>
            <div style="font-size: 1.2em; margin-bottom: 5px;">${value.text}</div>
            <div style="color: #666; font-size: 0.9em;">${categoryMapping[value.category].name}</div>
        `;
        topThreeContainer.appendChild(card);
    }
    
    // 顯示第四至十名
    const remainingContainer = document.getElementById('remainingValues');
    remainingContainer.innerHTML = '';
    
    for (let i = 3; i < 10; i++) {
        const valueIndex = finalRanking[i];
        const value = valuesData[valueIndex];
        const card = document.createElement('div');
        card.className = `remaining-card ${categoryMapping[value.category].color}`;
        card.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 5px;">第${i + 1}名</div>
            <div style="margin-bottom: 5px;">${value.text}</div>
            <div style="color: #666; font-size: 0.8em;">${categoryMapping[value.category].name}</div>
        `;
        remainingContainer.appendChild(card);
    }
    
    // 顯示分類統計
    displayCategorySummary();
}

function displayCategorySummary() {
    const categoryCounts = {};
    Object.keys(categoryMapping).forEach(key => {
        categoryCounts[key] = 0;
    });
    
    finalRanking.forEach(index => {
        const category = valuesData[index].category;
        categoryCounts[category]++;
    });
    
    const summaryContainer = document.getElementById('categorySummary');
    summaryContainer.innerHTML = '';
    
    Object.entries(categoryCounts).forEach(([category, count]) => {
        const item = document.createElement('div');
        item.className = `category-item ${categoryMapping[category].color}`;
        item.innerHTML = `
            <div class="category-count">${count}</div>
            <div style="font-size: 1.2em; font-weight: bold;">${categoryMapping[category].name}</div>
            <div style="color: #666; margin-top: 5px;">${count} 個價值觀</div>
        `;
        summaryContainer.appendChild(item);
    });
}

function restartAssessment() {
    // 重置所有變數
    selectedValues = [];
    finalRanking = [];
    currentPhase = 'login';
    
    // 隱藏所有區塊
    document.getElementById('resultsSection').classList.add('hidden');
    document.getElementById('rankingSection').classList.add('hidden');
    document.getElementById('reductionSection').classList.add('hidden');
    document.getElementById('selectionSection').classList.add('hidden');
    
    // 顯示登入區塊
    document.getElementById('loginSection').classList.remove('hidden');
    document.getElementById('codeInput').value = '';
    document.getElementById('errorMessage').classList.add('hidden');
    
    // 重新渲染卡片
    renderValueCards();
}

// 輔助函數：洗牌陣列
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}