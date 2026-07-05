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
    currentConfig.cards.sort((a, b) => a.order - b.order).forEach((card) => {
        const li = document.createElement('li');
        li.className = `card-item ${currentEditingId === card.id ? 'active' : ''}`;
        li.innerHTML = `
            <div style="flex:1; cursor:pointer;" onclick="editCard('${card.id}')">
                <small style="color:#6366f1; font-weight:bold;">${card.type}</small><br>
                <span style="font-size:14px;">${card.data.title || card.data.welcome || '제목 없음'}</span>
            </div>
            <button onclick="deleteCard('${card.id}')" style="color:#ff3b30; background:none; border:none; cursor:pointer; font-size:12px;">삭제</button>
        `;
        list.appendChild(li);
    });
}

function editCard(id) {
    currentEditingId = id;
    const card = currentConfig.cards.find(c => c.id === id);
    const panel = document.getElementById('editor-panel');
    renderCardList();

    let html = `<div class="editor-form"><h2 style="margin-bottom:20px; border-bottom:2px solid #6366f1; padding-bottom:10px;">${card.type} 편집</h2>`;
    
    for (const key in card.data) {
        const val = card.data[key];
        html += `<div class="field-group" style="margin-bottom:15px;"><label style="display:block; font-weight:bold; margin-bottom:5px; font-size:13px; color:#666;">${key}</label>`;
        
        // 1. 플레이리스트 (찬양 목록) 처리
        if (key === 'items' && Array.isArray(val)) {
            html += `<div id="playlist-container">`;
            val.forEach((item, idx) => {
                html += `
                <div style="background:#f9f9f9; border:1px solid #ddd; padding:10px; margin-bottom:10px; border-radius:8px;">
                    <input type="text" placeholder="찬양 제목" value="${item.title}" oninput="updatePlaylistItem('${card.id}', ${idx}, 'title', this.value)" style="width:100%; margin-bottom:5px;">
                    <input type="text" placeholder="유튜브 링크" value="${item.url}" oninput="updatePlaylistItem('${card.id}', ${idx}, 'url', this.value)" style="width:100%;">
                    <button onclick="removePlaylistItem('${card.id}', ${idx})" style="margin-top:5px; color:#ff3b30; border:none; background:none; cursor:pointer; font-size:12px;">[목록에서 삭제]</button>
                </div>`;
            });
            html += `</div><button onclick="addPlaylistItem('${card.id}')" style="width:100%; padding:8px; background:#34c759; color:white; border:none; border-radius:5px; cursor:pointer;">+ 찬양 추가하기</button>`;
        } 
        // 2. 이미지/비디오 파일 업로드 처리
        else if (key.toLowerCase().includes('image') || key === 'qrImage' || key === 'videoUrl') {
            html += `
                <input type="text" id="input-${key}" value="${val}" oninput="updateData('${card.id}', 'data.${key}', this.value)" style="width:100%;">
                <div style="margin-top:5px;">
                    <input type="file" onchange="handleFileUpload(this, '${card.id}', 'data.${key}')" style="font-size:12px;">
                </div>`;
        } 
        // 3. 본문 줄바꿈 처리
        else if (key === 'content' || key === 'description' || key === 'subtitle') {
            html += `<textarea oninput="updateData('${card.id}', 'data.${key}', this.value)" style="width:100%; height:120px; padding:10px; border:1px solid #ddd; border-radius:5px;">${val}</textarea>`;
        } 
        // 4. 일반 텍스트
        else {
            html += `<input type="text" value="${val}" oninput="updateData('${card.id}', 'data.${key}', this.value)" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:5px;">`;
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
        alert('파일이 정상적으로 업로드되었습니다.');
        editCard(cardId);
    };
    reader.readAsDataURL(file);
};

window.updatePlaylistItem = (id, idx, field, val) => {
    const card = currentConfig.cards.find(c => c.id === id);
    card.data.items[idx][field] = val;
};

window.addPlaylistItem = (id) => {
    const card = currentConfig.cards.find(c => c.id === id);
    if(!card.data.items) card.data.items = [];
    card.data.items.push({title:'', url:''});
    editCard(id);
};

window.removePlaylistItem = (id, idx) => {
    currentConfig.cards.find(c => c.id === id).data.items.splice(idx, 1);
    editCard(id);
};

window.deleteCard = (id) => {
    if(confirm('정말 삭제하시겠습니까?')) {
        currentConfig.cards = currentConfig.cards.filter(c => c.id !== id);
        renderCardList();
        document.getElementById('editor-panel').innerHTML = '<p style="text-align:center; color:#999; margin-top:50px;">편집할 카드를 왼쪽에서 선택하세요.</p>';
    }
};

function initEventListeners() {
    document.getElementById('btnAd