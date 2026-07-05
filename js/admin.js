let currentConfig = null;
let currentEditingId = null;

document.addEventListener('DOMContentLoaded', async () => {
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
            const response = await fetch('./config.json');
            if (!response.ok) throw new Error();
            currentConfig = await response.json();
        }
    } catch (e) {
        currentConfig = { metadata: { title: "수련회 초대장" }, cards: [] };
    }
}

function renderCardList() {
    const list = document.getElementById('card-list');
    if (!list) return;
    list.innerHTML = '';
    currentConfig.cards.sort((a, b) => a.order - b.order).forEach((card, index) => {
        const li = document.createElement('li');
        li.className = `card-item ${currentEditingId === card.id ? 'active' : ''}`;
        li.innerHTML = `
            <div style="flex:1; cursor:pointer;" onclick="editCard('${card.id}')">
                <small style="color:#6366f1; font-weight:bold;">${card.type}</small><br>
                <span>${card.data.title || card.data.welcome || '제목 없음'}</span>
            </div>
            <button onclick="deleteCard('${card.id}')" style="color:red; background:none; border:none; cursor:pointer;">삭제</button>
        `;
        list.appendChild(li);
    });
}

function editCard(id) {
    currentEditingId = id;
    const card = currentConfig.cards.find(c => c.id === id);
    const panel = document.getElementById('editor-panel');
    renderCardList();

    let html = `<div class="editor-form"><h2>${card.type} 편집</h2>`;
    
    // 데이터 필드 생성
    for (const key in card.data) {
        const val = card.data[key];
        html += `<div class="field-group"><label>${key}</label>`;
        
        if (key === 'items' && Array.isArray(val)) {
            html += `<div id="playlist-container">`;
            val.forEach((item, idx) => {
                html += `
                <div style="border:1px solid #eee; padding:10px; margin-bottom:10px; border-radius:8px;">
                    <input type="text" placeholder="제목" value="${item.title}" oninput="updatePlaylistItem('${card.id}', ${idx}, 'title', this.value)">
                    <input type="text" placeholder="링크" value="${item.url}" oninput="updatePlaylistItem('${card.id}', ${idx}, 'url', this.value)" style="margin-top:5px;">
                    <button onclick="removePlaylistItem('${card.id}', ${idx})" style="margin-top:5px; color:red;">삭제</button>
                </div>`;
            });
            html += `</div><button onclick="addPlaylistItem('${card.id}')">+ 추가</button>`;
        } else if (key === 'content' || key === 'description' || key === 'subtitle') {
            html += `<textarea oninput="updateData('${card.id}', 'data.${key}', this.value)" style="width:100%; height:100px;">${val}</textarea>`;
        } else if (key.toLowerCase().includes('image') || key === 'qrImage' || key === 'videoUrl') {
            html += `
                <input type="text" id="input-${key}" value="${val}" oninput="updateData('${card.id}', 'data.${key}', this.value)">
                <input type="file" onchange="handleFileUpload(this, '${card.id}', 'data.${key}')" style="margin-top:5px;">`;
        } else {
            html += `<input type="text" value="${val}" oninput="updateData('${card.id}', 'data.${key}', this.value)">`;
        }
        html += `</div>`;
    }
    html += `</div>`;
    panel.innerHTML = html;
}

window.updateData = (id, path, value) => {
    const card = currentConfig.cards.find(c => c.id === id);
    const keys = path.split('.');
    card[keys[0]][keys[1]] = value;
    if(keys[1] === 'title' || keys[1] === 'welcome') renderCardList();
};

window.handleFileUpload = (input, cardId, path) => {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        updateData(cardId, path, e.target.result);
        alert('파일이 업로드되었습니다.');
        editCard(cardId);
    };
    reader.readAsDataURL(file);
};

window.updatePlaylistItem = (id, idx, field, val) => {
    const card = currentConfig.cards.find(c => c.id === id);
    card.data.items[idx][field] = val;
};
window.addPlaylistItem = (id) => {
    currentConfig.cards.find(c => c.id === id).data.items.push({title:'', url:''});
    editCard(id);
};
window.removePlaylistItem = (id, idx) => {
    currentConfig.cards.find(c => c.id === id).data.items.splice(idx, 1);
    editCard(id);
};
window.deleteCard = (id) => {
    if(confirm('삭제할까요?')) {
        currentConfig.cards = currentConfig.cards.filter(c => c.id !== id);
        renderCardList();
        document.getElementById('editor-panel').innerHTML = '';
    }
};

function initEventListeners() {
    document.getElementById('btnAddCard').onclick = () => document.getElementById('addCardModal').style.display = 'flex';
    document.querySelector('.btn-close-modal').onclick = () => document.getElementById('addCardModal').style.display = 'none';
    
    document.querySelectorAll('.card-type-grid button').forEach(btn => {
        btn.onclick = () => {
            const type = btn.dataset.type;
            const newCard = {
                id: 'card-' + Date.now(),
                type: type, visible: true, order: currentConfig.cards.length,
                style: { backgroundColor: "#ffffff", textColor: "#1d1d1f" },
                data: { title: "새 카드" }
            };
            if(type === 'Text') newCard.data.content = "내용을 입력하세요.";
            if(type === 'Hero') { newCard.data = { welcome: "WELCOME", title: "Love is...", subtitle: "2026 수련회", targetDate: "2026-08-06", backgroundImage: "" }; }
            if(type === 'Playlist') newCard.data.items = [];
            if(type === 'Video') { newCard.data = { title: "영상 제목", videoType: "youtube", videoUrl: "" }; }
            if(type === 'Application') { newCard.data = { title: "신청하기", description: "설명", qrImage: "", buttonText: "신청", buttonLink: "" }; }
            if(type === 'Info') { newCard.data = { date: "일시", location: "장소", googleMapsEmbedUrl: "", naverMapLink: "" }; }

            currentConfig.cards.push(newCard);
            document.getElementById('addCardModal').style.display = 'none';
            renderCardList();
            editCard(newCard.id);
        };
    });

    document.getElementById('btnSave').onclick = () => {
        localStorage.setItem('retreat_config', JSON.stringify(currentConfig));
        alert('브라우저에 저장되었습니다.');
    };
    document.getElementById('btnDownload').onclick = () => {
        const blob = new Blob([JSON.stringify(currentConfig, null, 2)], {type:'application/json'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'config.json';
        a.click();
    };
}