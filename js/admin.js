/**
 * js/admin.js
 */
let currentConfig = null;
let currentEditingId = null;

document.addEventListener('DOMContentLoaded', async () => {
    console.log("Admin JS loaded");
    await loadConfig();
    initEventListeners();
    renderCardList();
});

async function loadConfig() {
    try {
        const saved = localStorage.getItem('retreat_config');
        if (saved) {
            currentConfig = JSON.parse(saved);
        } else {
            // 경로를 현재 위치 기준으로 호출
            const response = await fetch('./config.json');
            if (!response.ok) throw new Error();
            currentConfig = await response.json();
        }
    } catch (e) {
        currentConfig = {
            metadata: { title: "수련회 초대장", description: "" },
            cards: []
        };
    }
}

function renderCardList() {
    const list = document.getElementById('card-list');
    if(!list) return;
    list.innerHTML = '';

    currentConfig.cards.sort((a, b) => a.order - b.order).forEach((card, index) => {
        const li = document.createElement('li');
        li.className = `card-item ${currentEditingId === card.id ? 'active' : ''}`;
        li.innerHTML = `
            <div class="card-info-summary" style="flex:1; cursor:pointer;">
                <span class="type-badge">${card.type}</span>
                <span class="title-preview">${card.data.title || card.data.welcome || '제목 없음'}</span>
            </div>
            <button onclick="deleteCard('${card.id}')" style="color:red; background:none; border:none; cursor:pointer;">삭제</button>
        `;
        li.querySelector('.card-info-summary').onclick = () => editCard(card.id);
        list.appendChild(li);
    });
}

function editCard(id) {
    currentEditingId = id;
    const card = currentConfig.cards.find(c => c.id === id);
    const panel = document.getElementById('editor-panel');
    renderCardList();

    let html = `<div class="editor-form"><h3>${card.type} 편집</h3>`;
    
    for (const key in card.data) {
        const val = card.data[key];

        // 1. 플레이리스트(items) 처리
        if (key === 'items' && Array.isArray(val)) {
            html += `<div class="field-group"><label>찬양 목록</label><div id="playlist-items-container">`;
            val.forEach((item, index) => {
                html += `
                    <div style="display:flex; gap:5px; margin-bottom:10px; border:1px solid #eee; padding:10px; border-radius:8px;">
                        <div style="flex:1">
                            <input type="text" placeholder="찬양 제목" value="${item.title}" 
                                   oninput="updatePlaylistItem('${card.id}', ${index}, 'title', this.value)" style="margin-bottom:5px;">
                            <input type="text" placeholder="유튜브 링크 (https://...)" value="${item.url}" 
                                   oninput="updatePlaylistItem('${card.id}', ${index}, 'url', this.value)">
                        </div>
                        <button onclick="removePlaylistItem('${card.id}', ${index})" style="background:#ff3b30; color:white; border:none; padding:5px 10px; border-radius:5px; cursor:pointer;">X</button>
                    </div>`;
            });
            html += `</div><button onclick="addPlaylistItem('${card.id}')" style="width:100%; padding:10px; background:#34c759; color:white; border:none; border-radius:8px; cursor:pointer; margin-top:5px;">+ 찬양 추가하기</button></div>`;
        } 
        // 2. 긴 문장(본문) 처리
        else if (key === 'content' || key === 'description') {
            html += `
                <div class="field-group">
                    <label>${key}</label>
                    <textarea oninput="updateData('${card.id}', 'data.${key}', this.value)" style="width:100%; height:100px;">${val}</textarea>
                </div>`;
        } 
        // 3. 일반 텍스트 처리
        else {
            html += `
                <div class="field-group">
                    <label>${key}</label>
                    <input type="text" value="${val}" oninput="updateData('${card.id}', 'data.${key}', this.value)">
                </div>`;
        }
    }
    html += `</div>`;
    panel.innerHTML = html;
}

// --- 플레이리스트 조작 함수들 추가 ---

window.updatePlaylistItem = function(cardId, index, field, value) {
    const card = currentConfig.cards.find(c => c.id === cardId);
    card.data.items[index][field] = value;
};

window.addPlaylistItem = function(cardId) {
    const card = currentConfig.cards.find(c => c.id === cardId);
    card.data.items.push({ title: "", url: "" });
    editCard(cardId); // 화면 새로고침
};

window.removePlaylistItem = function(cardId, index) {
    const card = currentConfig.cards.find(c => c.id === cardId);
    card.data.items.splice(index, 1);
    editCard(cardId); // 화면 새로고침
};

function updateData(id, path, value) {
    const card = currentConfig.cards.find(c => c.id === id);
    const keys = path.split('.');
    card[keys[0]][keys[1]] = value;
}

function deleteCard(id) {
    if(!confirm('삭제할까요?')) return;
    currentConfig.cards = currentConfig.cards.filter(c => c.id !== id);
    renderCardList();
    document.getElementById('editor-panel').innerHTML = '';
}

function initEventListeners() {
    const btnAddCard = document.getElementById('btnAddCard');
    const modal = document.getElementById('addCardModal');
    
    if(btnAddCard) {
        btnAddCard.onclick = () => modal.style.display = 'flex';
    }

    document.querySelectorAll('.card-type-grid button').forEach(btn => {
        btn.onclick = () => {
            const type = btn.dataset.type;
            const newCard = {
                id: 'card-' + Date.now(),
                type: type,
                visible: true,
                order: currentConfig.cards.length,
                style: { backgroundColor: "#ffffff", textColor: "#1d1d1f" },
                data: { title: "새 카드", content: "내용을 입력하세요" }
            };
            currentConfig.cards.push(newCard);
            modal.style.display = 'none';
            renderCardList();
            editCard(newCard.id);
        };
    });

    document.getElementById('btnSave').onclick = () => {
        localStorage.setItem('retreat_config', JSON.stringify(currentConfig));
        alert('임시 저장되었습니다.');
    };

    document.getElementById('btnDownload').onclick = () => {
        const blob = new Blob([JSON.stringify(currentConfig, null, 2)], {type : 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'config.json';
        a.click();
    };
}