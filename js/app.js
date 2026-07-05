/**
 * App.js
 * 메인 실행 로직 및 유틸리티 기능
 */

document.addEventListener('DOMContentLoaded', async () => {
    try {
        // 1. Config 로드 (관리자 수정한 내역이 localStorage에 있으면 그것을 우선함)
        let config;
        const savedConfig = localStorage.getItem('retreat_config');
        
        if (savedConfig) {
            config = JSON.parse(savedConfig);
        } else {
            const response = await fetch('./config.json');
            config = await response.json();
        }

        // 2. 렌더러 실행
        Renderer.init(config);

        // 3. 플로팅 액션 버튼(FAB) 설정
        setupFAB(config);

        // 4. 다크모드 대응
        if (config.metadata.darkMode) {
            document.body.classList.add('dark-mode');
        }

    } catch (error) {
        console.error('초대장을 불러오는 중 오류가 발생했습니다:', error);
        document.getElementById('app').innerHTML = `
            <div class="error-state">
                <p>초대장을 불러올 수 없습니다. <br> 잠시 후 다시 시도해주세요.</p>
            </div>
        `;
    }
});

function setupFAB(config) {
    const fabContainer = document.createElement('div');
    fabContainer.className = 'fab-container';
    fabContainer.innerHTML = `
        <button class="fab-main" id="fabMain"><span>+</span></button>
        <div class="fab-menu" id="fabMenu">
            <button class="fab-item" id="btnShare">공유</button>
            <button class="fab-item" id="btnTop">TOP</button>
        </div>
    `;
    document.body.appendChild(fabContainer);

    const mainBtn = document.getElementById('fabMain');
    const menu = document.getElementById('fabMenu');

    mainBtn.addEventListener('click', () => {
        menu.classList.toggle('active');
        mainBtn.classList.toggle('active');
    });

    document.getElementById('btnTop').addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        menu.classList.remove('active');
        mainBtn.classList.remove('active');
    });

    document.getElementById('btnShare').addEventListener('click', () => {
        if (navigator.share) {
            navigator.share({
                title: config.metadata.title,
                text: config.metadata.description,
                url: window.location.href,
            });
        } else {
            // 클립보드 복사 대체
            const t = document.createElement("textarea");
            document.body.appendChild(t);
            t.value = window.location.href;
            t.select();
            document.execCommand('copy');
            document.body.removeChild(t);
            alert('링크가 복사되었습니다!');
        }
    });
}