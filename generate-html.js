const fs = require('fs');
const path = require('path');

// asset 폴더의 모든 description 파일 읽기
function readDescriptionFiles() {
    const assetDir = path.join(__dirname, 'asset');
    const episodes = [];
    
    if (!fs.existsSync(assetDir)) {
        console.log('asset 폴더가 없습니다.');
        return episodes;
    }
    
    const folders = fs.readdirSync(assetDir);
    
    folders.forEach(folder => {
        const folderPath = path.join(assetDir, folder);
        if (fs.statSync(folderPath).isDirectory()) {
            const descPath = path.join(folderPath, 'description.txt');
            
            if (fs.existsSync(descPath)) {
                const content = fs.readFileSync(descPath, 'utf-8');
                const lines = content.split('\n');
                
                // 폴더 내의 모든 이미지 파일 찾기
                const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
                const files = fs.readdirSync(folderPath);
                let imageFile = null;
                
                for (const file of files) {
                    const ext = path.extname(file).toLowerCase();
                    if (imageExtensions.includes(ext)) {
                        imageFile = file;
                        break; // 첫 번째 이미지 파일 사용
                    }
                }
                
                const episode = {
                    folder: folder,
                    title: '',
                    description: '',
                    designer: '',
                    link: '',
                    imageFile: imageFile
                };
                
                let currentSection = '';
                lines.forEach((line, index) => {
                    const trimmedLine = line.trim();
                    if (trimmedLine.startsWith('제목:')) {
                        episode.title = trimmedLine.substring(3).trim();
                        currentSection = '';
                    } else if (trimmedLine.startsWith('설명:')) {
                        episode.description = trimmedLine.substring(3).trim();
                        currentSection = 'description';
                    } else if (trimmedLine.startsWith('디자이너:')) {
                        episode.designer = trimmedLine.substring(5).trim();
                        currentSection = '';
                    } else if (trimmedLine.startsWith('링크:')) {
                        episode.link = trimmedLine.substring(3).trim();
                        currentSection = '';
                    } else if (currentSection === 'description') {
                        // 설명 섹션에 있을 때: 빈 줄이면 줄바꿈 추가, 내용이 있으면 줄바꿈과 함께 추가
                        if (trimmedLine === '') {
                            // 빈 줄은 줄바꿈으로 유지
                            if (episode.description) {
                                episode.description += '\n';
                            }
                        } else {
                            // 내용이 있는 줄
                            if (episode.description) {
                                episode.description += '\n' + trimmedLine;
                            } else {
                                episode.description = trimmedLine;
                            }
                        }
                    }
                });
                
                episodes.push(episode);
            }
        }
    });
    
    return episodes;
}

// YouTube 링크를 embed 형식으로 변환
function convertToEmbedUrl(url) {
    if (!url) return '';
    
    // YouTube watch URL을 embed URL로 변환
    const watchMatch = url.match(/[?&]v=([^&]+)/);
    if (watchMatch) {
        return `https://www.youtube.com/embed/${watchMatch[1]}`;
    }
    
    // 이미 embed 형식이면 그대로 반환
    if (url.includes('youtube.com/embed')) {
        return url;
    }
    
    return url;
}

// HTML 에피소드 섹션 생성
function generateEpisodeHTML(episode, index) {
    const fullText = episode.description;
    const imageSrc = episode.imageFile 
        ? `asset/${episode.folder}/${episode.imageFile}`
        : '';
    const videoUrl = episode.link ? convertToEmbedUrl(episode.link) : '';
    
    // 이미지/영상 부분
    let imageHTML = '';
    if (imageSrc) {
        // 이미지가 있고 링크가 있으면 클릭 가능한 링크로 만들기
        const imgTag = `<img src="${imageSrc}" alt="${episode.title}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 4px; cursor: pointer;">`;
        if (episode.link) {
            // 화살표 버튼 추가
            const arrowButton = `<div class="image-link-arrow">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </div>`;
            imageHTML = `<a href="${episode.link}" target="_blank" rel="noopener noreferrer" class="episode-image-link">${imgTag}${arrowButton}</a>`;
        } else {
            imageHTML = imgTag;
        }
    } else if (videoUrl) {
        imageHTML = `<iframe 
                    src="${videoUrl}" 
                    frameborder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowfullscreen>
                </iframe>`;
    } else {
        // 이미지가 없을 때 블랙 배경
        imageHTML = `<div style="width: 100%; height: 100%; background: #000;"></div>`;
    }
    
    // 디자이너 정보 포함된 전체 텍스트 (펼쳤을 때만 표시)
    const fullTextWithDesigner = episode.designer 
        ? fullText + `\n\n디자이너: ${episode.designer}`
        : fullText;
    
    // Read more 버튼 (설명이 140자 초과하거나 디자이너 정보가 있는 경우 표시)
    const showReadMore = fullText.length > 140 || episode.designer;
    const readMoreButton = showReadMore 
        ? `<button class="read-more-link" onclick="toggleDescription(this)" style="display: none;">Read more<span>↓</span></button>`
        : '';
    
    // HTML 속성에 저장할 때 JSON.stringify를 사용하여 줄바꿈과 따옴표를 안전하게 처리
    const escapedFullText = JSON.stringify(fullText);
    const escapedDesigner = episode.designer ? JSON.stringify(episode.designer) : '""';
    
    return `        <div class="episode">
            <div class="episode-content">
                <h2 class="episode-title">${episode.title}</h2>
                <p class="episode-description" data-full-text=${escapedFullText} data-designer=${escapedDesigner}></p>
                ${readMoreButton}
            </div>
            <div class="episode-image">
                ${imageHTML}
            </div>
        </div>`;
}

// HTML 파일 생성
function generateHTML() {
    const episodes = readDescriptionFiles();
    
    if (episodes.length === 0) {
        console.log('에피소드를 찾을 수 없습니다.');
        return;
    }
    
    // 기존 index.html 읽기
    const htmlPath = path.join(__dirname, 'index.html');
    let htmlContent = fs.readFileSync(htmlPath, 'utf-8');
    
    // container 시작 위치 찾기
    const containerStartMatch = htmlContent.match(/(\s+)<div class="container">/);
    if (!containerStartMatch) {
        console.log('HTML 구조를 찾을 수 없습니다.');
        return;
    }
    
    const indent = containerStartMatch[1];
    const containerStart = htmlContent.indexOf('<div class="container">');
    
    // 첫 번째 episode를 찾아서 시작 위치를 찾기
    const firstEpisodeIndex = htmlContent.indexOf('<div class="episode">', containerStart);
    const scriptIndex = htmlContent.indexOf('<script>');
    
    if (firstEpisodeIndex === -1 || scriptIndex === -1) {
        console.log('HTML 구조를 찾을 수 없습니다.');
        return;
    }
    
    // script 태그 바로 앞의 </div> 찾기 (container 닫는 태그)
    const containerEnd = htmlContent.lastIndexOf('</div>', scriptIndex);
    
    if (containerEnd === -1 || containerEnd < containerStart) {
        console.log('Container 닫는 태그를 찾을 수 없습니다.');
        return;
    }
    
    // 에피소드 HTML 생성
    const episodesHTML = episodes.map((episode, index) => generateEpisodeHTML(episode, index)).join('\n');
    
    // HTML 업데이트 (에피소드 부분만 교체)
    const beforeEpisodes = htmlContent.substring(0, firstEpisodeIndex);
    const afterEpisodes = htmlContent.substring(containerEnd);
    
    const newHTML = beforeEpisodes + episodesHTML + '\n' + indent + afterEpisodes;
    
    // 파일 저장
    fs.writeFileSync(htmlPath, newHTML, 'utf-8');
    
    console.log(`${episodes.length}개의 에피소드를 업데이트했습니다.`);
    episodes.forEach((episode, index) => {
        console.log(`  ${index + 1}. ${episode.title}`);
    });
}

// 실행
generateHTML();

