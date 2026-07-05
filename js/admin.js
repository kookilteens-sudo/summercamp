let currentConfig = null;
let currentEditingId = null;

document.addEventListener('DOMContentLoaded', async () => {
    // 1. 데이터 로드 시작
    await loadConfig();
    // 2. 이벤트 리스너 연결
    initEventListeners();
    // 3. 목록 화면 출력
    renderCardList();
});

// [중요] 서버의 config.json 또는 로컬 저장소에서 데이터 가져오기
async function loadConfig() {
    try {
        const saved = localStorage.getItem('retreat_config');
        
        // 브라우저에 저장된 데이터가 있다면 그것을 사용
        if (saved && saved !== 'undefined') {
            console.log("로컬 저장소에서 데이터를 불러왔습니다.");
            currentConfig = JSON.parse(saved);
        } else {
            // 저장된 게 없다면 서버의 config.json 파일을 가져옴
            console.log("서버의 config.json 파일을 새로 불러옵니다.");
            const response = await fetch('./config.json?v=' + Date.now()); // 캐시 방지
            if (!response.ok) throw new Error('파일 없음');
            currentConfig = await response.json();
        }
    } catch (e) {
        console.error("데이터 로드 실패:", e);
        // 최후의 수단: 기본 구조 생성
        currentConfig = { 
            metadata: { title: "수련회 초대장", description: "" }, 
            cards: [] 
        };
    }
}

function renderCardList() {
    const list = document.getElementById('card-list');
    if (!list) return;
    list.innerHTML = '';
    
    if (!currentConfig.cards || currentConfig.cards.length === 0) {
        list.innerHTML = '<p style="font-size:12px; color:#999; text-align:center; padding:20px;">등록된 카드가 없습니다.</p>';
    }

    currentConfig.cards.sort((a, b) => a.order - b.order).forEach((card) => {
        const li = document.createElement('li');
        li.className = `card-item ${currentEditingId === card.id ? 'active' : ''}`;
        li.style = "display:flex; align-items:center; background:white; margin-bottom:8px; padding:10px; border-radius:8px; border:1px solid #ddd; cursor:pointer;";
        li.innerHTML = `
            <div style="flex:1;" onclick="editCard('${card.id}')">
                <small style="color:#6366f1; font-weight:bold; font-size:10px;">${card.type}</small><br>
                <span style="font-size:13px; font-weight:500;">${card.data.title || card.data.welcome || '제목 없음'}</span>
            </div>
            <button onclick="deleteCard('${card.id}')" style="color:#ff3b30; background:none; border:none; cursor:pointer; font-size:12px; padding:5px;">삭제</button>
        `;
        list.appendChild(li);
    });
}

function editCard(id) {
    currentEditingId = id;
    const card = currentConfig.cards.find(c => c.id === id);
    const panel = document.getElementById('editor-panel');
    renderCardList();

    let html = `<div class="editor-form"><h2 style="margin-bottom:20px; border-bottom:2px solid #6366f1; padding-bottom:10px; font-size:18px;">${card.type} 편집</h2>`;
    
    for (const key in card.data) {
        const val = card.data[key];
        html += `<div class="field-group" style="margin-bottom:15px;"><label style="display:block; font-weight:bold; margin-bottom:5px; font-size:12px; color:#666;">${key}</label>`;
        
        if (key === 'items' && Array.isArray(val)) {
            html += `<div id="playlist-container">`;
            val.forEach((item, idx) => {
                html += `
                <div style="background:#f9f9f9; border:1px solid #ddd; padding:10px; margin-bottom:10px; border-radius:8px;">
                    <input type="text" placeholder="찬양 제목" value="${item.title}" oninput="updatePlaylistItem('${card.id}', ${idx}, 'title', this.value)" style="width:100%; padding:8px; margin-bottom:5px; border:1px solid #ccc; border-radius:4px;">
                    <input type="text" placeholder="유튜브 링크" value="${item.url}" oninput="updatePlaylistItem('${card.id}', ${idx}, 'url', this.value)" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px;">
                    <button onclick="removePlaylistItem('${card.id}', ${idx})" style="margin-top:5px; color:#ff3b30; border:none; background:none; cursor:pointer; font-size:11px;">[삭제]</button>
                </div>`;
            });
            html += `</div><button onclick="addPlaylistItem('${card.id}')" style="width:100%; padding:8px; background:#34c759; color:white; border:none; border-radius:5px; cursor:pointer;">+ 찬양 목록 추가</button>`;
        } 
        else if (key.toLowerCase().includes('image') || key === 'qrImage' || key === 'videoUrl' || key === 'backgroundImage') {
            html += `
                <input type="text" id="input-${key}" value="${val}" oninput="updateData('${card.id}', 'data.${key}', this.value)" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
                <div style="margin-top:5px;">
                    <input type="file" onchange="handleFileUpload(this, '${card.id}', 'data.${key}')" style="font-size:11px;">
                </div>`;
        } 
        else if (key === 'content' || key === 'description' || key === 'subtitle') {
            html += `<textarea oninput="updateData('${card.id}', 'data.${key}', this.value)" style="width:100%; height:100px; padding:10px; border:1px solid #ddd; border-radius:4px; font-family:inherit;">${val}</textarea>`;
        } 
        else {
            html += `<input type="text" value="${val}" oninput="updateData('${card.id}', 'data.${key}', this.value)" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">`;
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
        alert('업로드 완료!');
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
        document.getElementById('editor-panel').innerHTML = '';
    }
};

function initEventListeners() {
    document.getElementById('btnAddCard').onclick = () => document.getElementById('addCardModal').style.display = 'flex';
    document.querySelector('.btn-close-modal').onclick = () => document.getElementById('addCardModal').style.display = 'none';
    
    document.querySelectorAll('.card-type-grid button').forEach(btn => {
        btn.onclick = () => {
            const type = btn.dataset.type;
            let initialData = { title: "새 카드" };
            if(type === 'Hero') initialData = { welcome: "WELCOME", title: "Love is...", subtitle: "2026 수련회", targetDate: "2026-08-06", backgroundImage: "" };
            if(type === 'Text') initialData = { title: "안녕!", content: "내용을 입력하세요." };
            if(type === 'Playlist') initialData = { title: "찬양 목록", items: [] };
            if(type === 'Video') initialData = { title: "영상 제목", videoType: "youtube", videoUrl: "" };
            if(type === 'Application') initialData = { title: "신청하기", description: "설명", qrImage: "", buttonText: "신청", buttonLink: "" };
            if(type === 'Info') initialData = { date: "8/6~8/8", location: "곤지암교회", googleMapsEmbedUrl: "", naverMapLink: "" };

            currentConfig.cards.push({
                id: 'card-' + Date.now(),
                type: type, visible: true, order: currentConfig.cards.length,
                style: { backgroundColor: "#ffffff", textColor: "#1d1d1f" },
                data: initialData
            });
            document.getElementById('addCardModal').style.display = 'none';
            renderCardList();
        };
    });

    // 설정 저장 (브라우저)
    document.getElementById('btnSave').onclick = () => {
        localStorage.setItem('retreat_config', JSON.stringify(currentConfig));
        alert('브라우저에 저장되었습니다. 이제 [미리보기]에서 확인 가능합니다.');
    };

    // JSON 다운로드
    document.getElementById('btnDownload').onclick = () => {
        const blob = new Blob([JSON.stringify(currentConfig, null, 2)], {type:'application/json'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'config.json';
        a.click();
    };

    // [중요] 초기화 및 서버 파일 다시 불러오기
    document.getElementById('btnReset').onclick = async () => {
        if (confirm('현재 편집 중인 내용을 버리고 서버에 저장된 마지막 파일(config.json)을 불러올까요?')) {
            localStorage.removeItem('retreat_config');
            await loadConfig();
            renderCardList();
            document.getElementById('editor-panel').innerHTML = '';
            alert('서버 파일에서 데이터를 복구했습니다.');
        }
    };
}