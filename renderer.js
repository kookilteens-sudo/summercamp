/**
 * Renderer.js
 * JSON 데이터를 기반으로 화면을 구성하는 핵심 엔진
 */

const Renderer = {
    // 카드 타입별 렌더링 함수 맵
    renderers: {
        Hero: (data, style) => {
            const ddayText = Renderer.utils.calculateDday(data.targetDate);
            return `
                <section class="card-hero" style="background-image: url('${data.backgroundImage}');">
                    <div class="overlay" style="background: rgba(0,0,0,${style.overlayOpacity})"></div>
                    <div class="hero-content" style="color: ${style.textColor}">
                        <div class="welcome-badge" data-aos="${style.animation}">${data.welcome}</div>
                        <p class="subtitle" data-aos="${style.animation}" data-aos-delay="100">${data.subtitle}</p>
                        <h1 class="title" data-aos="${style.animation}" data-aos-delay="200">${data.title}</h1>
                        <div class="d-day-container" data-aos="${style.animation}" data-aos-delay="300">
                            <span class="d-day-label">D-DAY</span>
                            <span class="d-day-value">${ddayText}</span>
                        </div>
                    </div>
                    <div class="scroll-indicator"></div>
                </section>
            `;
        },

        Text: (data, style) => {
            const formattedContent = data.content.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            return `
                <section class="card-text" style="background-color: ${style.backgroundColor}; color: ${style.textColor}; padding: ${style.padding}; text-align: ${style.textAlign};">
                    <div class="container" data-aos="${style.animation}">
                        ${data.title ? `<h2 class="card-title">${data.title}</h2>` : ''}
                        <p class="card-body">${formattedContent}</p>
                    </div>
                </section>
            `;
        },

        Application: (data, style) => {
            return `
                <section class="card-app" style="background-color: ${style.backgroundColor};">
                    <div class="container glass" data-aos="${style.animation}">
                        <h2 class="card-title">${data.title}</h2>
                        <p class="card-description">${data.description}</p>
                        ${data.qrImage ? `<img src="${data.qrImage}" alt="QR Code" class="qr-image">` : ''}
                        <a href="${data.buttonLink}" target="_blank" class="cta-button" style="background-color: ${style.primaryColor}">
                            ${data.buttonText}
                        </a>
                    </div>
                </section>
            `;
        },

        Info: (data, style) => {
            return `
                <section class="card-info" style="background-color: ${style.backgroundColor};">
                    <div class="container" data-aos="${style.animation}">
                        <div class="info-item">
                            <span class="icon">📅</span>
                            <div class="info-text">
                                <strong>일시</strong>
                                <span>${data.date}</span>
                            </div>
                        </div>
                        <div class="info-item">
                            <span class="icon">📍</span>
                            <div class="info-text">
                                <strong>장소</strong>
                                <span>${data.location}</span>
                            </div>
                        </div>
                        <div class="map-wrapper">
                            <iframe src="${data.googleMapsEmbedUrl}" width="100%" height="250" style="border:0;" allowfullscreen="" loading="lazy"></iframe>
                        </div>
                        <a href="${data.naverMapLink}" target="_blank" class="map-link-button">네이버 지도로 길찾기</a>
                    </div>
                </section>
            `;
        },

        Poster: (data, style) => {
            return `
                <section class="card-poster" data-aos="${style.animation}">
                    <img src="${data.imageUrl}" alt="${data.alt}" class="poster-image" loading="lazy">
                </section>
            `;
        },

        Schedule: (data, style) => {
            return `
                <section class="card-schedule" style="background-color: ${style.backgroundColor};">
                    <div class="container" data-aos="${style.animation}">
                        <h2 class="card-title">Schedules</h2>
                        <p class="notice-text">${data.notice}</p>
                        ${data.imageUrl ? `<img src="${data.imageUrl}" class="schedule-image" loading="lazy">` : ''}
                    </div>
                </section>
            `;
        },

        Video: (data, style) => {
            let videoHtml = '';
            if (data.videoType === 'youtube') {
                videoHtml = `<iframe src="${data.videoUrl}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
            } else {
                videoHtml = `<video controls src="${data.videoUrl}"></video>`;
            }
            return `
                <section class="card-video" data-aos="${style.animation}">
                    <div class="container">
                        <h2 class="card-title">${data.title}</h2>
                        <div class="video-wrapper">${videoHtml}</div>
                    </div>
                </section>
            `;
        },

        Playlist: (data, style) => {
            return `
                <section class="card-playlist" style="background-color: ${style.backgroundColor}; color: ${style.textColor};">
                    <div class="container" data-aos="fade-up">
                        <h2 class="card-title" style="color: ${style.textColor}">${data.title}</h2>
                        <ul class="playlist-items">
                            ${data.items.map(item => `
                                <li class="playlist-item">
                                    <a href="${item.url}" target="_blank">
                                        <span class="play-icon">▶</span>
                                        <span class="song-title">${item.title}</span>
                                    </a>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                </section>
            `;
        },

        Intro: (data, style) => {
            return `
                <section class="card-intro" style="background-color: ${style.backgroundColor};">
                    <div class="container" data-aos="fade-up">
                        <div class="church-logo">⛪️</div>
                        <p class="intro-content">${data.content}</p>
                        <div class="social-links">
                            <a href="${data.instagram}" target="_blank" class="social-button instagram">Instagram</a>
                        </div>
                        <p class="copyright">© 2026 국일교회 청소년부. All rights reserved.</p>
                    </div>
                </section>
            `;
        }
    },

    utils: {
        calculateDday: (targetDate) => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const target = new Date(targetDate);
            target.setHours(0, 0, 0, 0);
            
            const diffTime = target - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays > 0) return `D-${diffDays}`;
            if (diffDays === 0) return `오늘 시작!`;
            if (diffDays < 0 && diffDays >= -2) return `행사 진행 중`;
            return `행사 종료`;
        }
    },

    // 초기화 및 실행
    init: function(config) {
        const app = document.getElementById('app');
        if (!app) return;

        // SEO 및 Metadata 설정
        document.title = config.metadata.title;
        
        // 카드 정렬 및 필터링
        const sortedCards = config.cards
            .filter(card => card.visible)
            .sort((a, b) => a.order - b.order);

        // 카드 렌더링
        let html = '';
        sortedCards.forEach(card => {
            if (this.renderers[card.type]) {
                html += this.renderers[card.type](card.data, card.style);
            }
        });

        app.innerHTML = html;
        
        // AOS 초기화 (애니메이션)
        if (window.AOS) {
            AOS.init({
                duration: 1000,
                once: false,
                mirror: true
            });
        }
    }
};