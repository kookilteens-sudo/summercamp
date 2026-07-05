/**
 * Admin.js
 * CMS 관리자 페이지 핵심 로직
 */

let currentConfig = null;
let currentEditingId = null;

document.addEventListener('DOMContentLoaded', async () => {
    await loadConfig();
    initEventListeners();
    renderCardList();
});

// 1. 데이터 로드
async function loadConfig() {
    try {
        const saved = localStorage.getItem('retreat_config');
        if (saved) {
            currentConfig = JSON.parse(saved);
        } else {
            const response = await fetch('./config.json');
            if (!response.ok) throw new Error('파일 없음');
            currentConfig = await response.json();
        }
    } catch (e) {
        // config.json이 없거나 에러 날 경우 기본 데이터 생성
        console.log("기본 설정으로 시작합니다.");
        currentConfig = {
            metadata: { title: "수련회 초대장" },
            cards: []
        };
    }
}

// 2. 사이드바 카드 목록 렌더링
function renderCardList() {
    const list = document.getElementById('card-list');
    list.innerHTML = '';

    currentConfig.cards
        .sort((a, b) => a.order - b.order)
        .forEach((card, index) => {
            const li = document.createElement('li');
            li.className = `card-item ${currentEditingId === card.id ? 'active' : ''} ${!card.visible ? 'hidden' : ''}`;
            li.draggable = true;
            li.dataset.id = card.id;
            li.dataset.index = index;

            li.innerHTML = `
                <div class="drag-handle"><i class="fa fa-grip-vertical"></i></div>
                <div class="card-info-summary" onclick="editCard('${card.id}')">
                    <span class="type-badge">${card.type}</span>
                    <span class="title-preview">${card.data.title || card.data.welcome || '제목 없음'}</span>
                </div>
                <div class="card-actions">
                    <button onclick="toggleVisibility('${card.id}')"><i class="fa ${card.visible ? 'fa-eye' : 'fa-eye-slash'}"></i></button>
                    <button onclick="duplicateCard('${card.id}')"><i class="fa fa-copy"></i></button>
                    <button onclick="deleteCard('${card.id}')" class="delete"><i class="fa fa-trash"></i></button>
                </div>
            `;

            // 드래그 앤 드롭 이벤트
            li.addEventListener('dragstart', handleDragStart);
            li.addEventListener('dragover', handleDragOver);
            li.addEventListener('drop', handleDrop);

            list.appendChild(li);
        });
}

// 3. 카드 편집 화면 렌더링
function editCard(id) {
    currentEditingId = id;
    const card = currentConfig.cards.find(c => c.id === id);
    const panel = document.getElementById('editor-panel');
    const typeTitle = document.getElementById('current-card-type');

    typeTitle.innerText = `${card.type} 카드 편집`;
    renderCardList(); // Active 표시 업데이트

    // 카드 타입별 필드 생성 (확장 가능한 구조)
    let html = `<div class="editor-form" data-id="${card.id}">`;
    
    // 공통 스타일 섹션
    html += `
        <details open>
            <summary>공통 스타일 설정</summary>
            <div class="field-group">
                <label>배경색</label>
                <input type="color" data-key="style.backgroundColor" value="${card.style.backgroundColor || '#ffffff'}">
                <label>글자색</label>
                <input type="color" data-key="style.textColor" value="${card.style.textColor || '#1d1d1f'}">
                <label>애니메이션</label>
                <select data-key="style.animation">
                    <option value="fade-up" ${card.style.animation === 'fade-up' ? 'selected' : ''}>Fade Up</option>
                    <option value="zoom-in" ${card.style.animation === 'zoom-in' ? 'selected' : ''}>Zoom In</option>
                    <option value="fade-left" ${card.style.animation === 'fade-left' ? 'selected' : ''}>Fade Left</option>
                </select>
            </div>
        </details>
        <hr>
    `;

    // 데이터 섹션
    html += `<div class="content-fields">`;
    for (const [key, value] of Object.entries(card.data)) {
        if (key === 'items') { // 플레이리스트 등 배열 데이터 처리
            html += `
                <div class="field-group">
                    <label>${key}</label>
                    <textarea class="json-input" data-key="data.${key}">${JSON.stringify(value, null, 2)}</textarea>
                    <p class="help-text">배열 데이터는 JSON 형식으로 직접 수정하세요.</p>
                </div>
            `;
        } else if (key.toLowerCase().includes('image') || key.toLowerCase().includes('url') && !key.toLowerCase().includes('embed')) {
            html += `
                <div class="field-group">
                    <label>${key}</label>
                    <input type="text" data-key="data.${key}" value="${value}">
                    <input type="file" onchange="handleFileUpload(this, '${key}')">
                </div>
            `;
        } else if (key === 'content' || key === 'description') {
            html += `
                <div class="field-group">
                    <label>${key}</label>
                    <textarea data-key="data.${key}">${value}</textarea>
                </div>
            `;
        } else {
            html += `
                <div class="field-group">
                    <label>${key}</label>
                    <input type="text" data-key="data.${key}" value="${value}">
                </div>
            `;
        }
    }
    html += `</div></div>`;

    panel.innerHTML = html;

    // 입력 이벤트 바인딩 (실시간 데이터 반영)
    panel.querySelectorAll('input, textarea, select').forEach(el => {
        el.addEventListener('input', (e) => {
            if (!e.target.dataset.key) return;
            updateData(id, e.target.dataset.key, e.target.value);
        });
    });
}

// 4. 데이터 업데이트 로직
function updateData(id, path, value) {
    const card = currentConfig.cards.find(c => c.id === id);
    const keys = path.split('.');
    
    // JSON 구조 안으로 파고들어 업데이트
    if (keys.length === 2) {
        if (keys[1] === 'items') {
            try { card[keys[0]][keys[1]] = JSON.parse(value); } catch(e) {}
        } else {
            card[keys[0]][keys[1]] = value;
        }
    }

    // 제목 필드 수정 시 왼쪽 목록 즉시 반영
    if (path === 'data.title' || path === 'data.welcome') {
        renderCardList();
    }
}

// 5. 파일 업로드 처리 (Base64 변환하여 JSON 저장)
function handleFileUpload(input, key) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const base64 = e.target.result;
        const textInput = input.previousElementSibling;
        textInput.value = base64;
        updateData(currentEditingId, `data.${key}`, base64);
        alert('이미지가 업로드되었습니다.');
    };
    reader.readAsDataURL(file);
}

// 6. 카드 조작 기능
function toggleVisibility(id) {
    const card = currentConfig.cards.find(c => c.id === id);
    card.visible = !card.visible;
    renderCardList();
}

function duplicateCard(id) {
    const card = currentConfig.cards.find(c => c.id === id);
    const newCard = JSON.parse(JSON.stringify(card));
    newCard.id = Date.now().toString();
    newCard.order = currentConfig.cards.length;
    currentConfig.cards.push(newCard);
    renderCardList();
}

function deleteCard(id) {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    currentConfig.cards = currentConfig.cards.filter(c => c.id !== id);
    if (currentEditingId === id) {
        currentEditingId = null;
        document.getElementById('editor-panel').innerHTML = '';
    }
    renderCardList();
}

// 7. 드래그 앤 드롭 로직
let dragSrcEl = null;

function handleDragStart(e) {
    dragSrcEl = this;
    e.dataTransfer.effectAllowed = 'move';
    this.classList.add('dragging');
}

function handleDragOver(e) {
    e.preventDefault();
    return false;
}

function handleDrop(e) {
    e.stopPropagation();
    if (dragSrcEl !== this) {
        const fromIndex = parseInt(dragSrcEl.dataset.index);
        const toIndex = parseInt(this.dataset.index);
        
        // 데이터 순서 변경
        const movedItem = currentConfig.cards.splice(fromIndex, 1)[0];
        currentConfig.cards.splice(toIndex, 0, movedItem);
        
        // order 값 재할당
        currentConfig.cards.forEach((c, i) => c.order = i);
        
        renderCardList();
    }
    dragSrcEl.classList.remove('dragging');
    return false;
}

// 8. 초기화 및 저장 버튼
function initEventListeners() {
    // 1. 카드 추가 버튼 (+)
    const btnAddCard = document.getElementById('btnAddCard');
    const modal = document.getElementById('addCardModal');
    
    if (btnAddCard) {
        btnAddCard.onclick = () => {
            console.log("추가 버튼 클릭됨"); // 디버깅용
            modal.style.display = 'flex';
        };
    }

    // 2. 모달 내 카드 타입 버튼들
    document.querySelectorAll('.card-type-grid button').forEach(btn => {
        btn.onclick = () => {
            const type = btn.dataset.type;
            const newCard = {
                id: "card-" + Date.now(),
                type: type,
                visible: true,
                order: currentConfig.cards.length,
                style: { backgroundColor: "#ffffff", textColor: "#1d1d1f", animation: "fade-up", padding: "60px 20px" },
                data: { title: `새 ${type} 카드`, content: "내용을 입력하세요." }
            };
            
            // 데이터 구조에 따라 초기값 보정
            if(type === 'Hero') newCard.data = { welcome: "WELCOME", title: "새로운 시작", subtitle: "문구를 입력하세요", targetDate: "2026-08-01", backgroundImage: "" };
            if(type === 'Info') newCard.data = { date: "일시 입력", location: "장소 입력", googleMapsEmbedUrl: "", naverMapLink: "" };

            currentConfig.cards.push(newCard);
            modal.style.display = 'none';
            renderCardList();
            editCard(newCard.id);
        };
    });

    // 3. 모달 닫기
    const btnClose = document.querySelector('.btn-close-modal');
    if (btnClose) {
        btnClose.onclick = () => { modal.style.display = 'none'; };
    }

    // 4. 저장 버튼들
    document.getElementById('btnSave').onclick = () => {
        localStorage.setItem('retreat_config', JSON.stringify(currentConfig));
        alert('브라우저에 임시 저장되었습니다! [JSON 저장]을 눌러 파일을 다운로드해 배포하세요.');
    };
    
    // 5. 다운로드 버튼
    document.getElementById('btnDownload').onclick = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentConfig, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "config.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };
}