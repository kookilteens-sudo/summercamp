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
        html += `
            <div class="field-group">
                <label>${key}</label>
                <input type="text" value="${val}" oninput="updateData('${card.id}', 'data.${key}', this.value)">
            </div>`;
    }
    html += `</div>`;
    panel.innerHTML = html;
}

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