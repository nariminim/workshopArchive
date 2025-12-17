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
            const thumbPath = path.join(folderPath, 'thumbnail.jpg');
            
            if (fs.existsSync(descPath)) {
                const content = fs.readFileSync(descPath, 'utf-8');
                const lines = content.split('\n').map(line => line.trim()).filter(line => line);
                
                const episode = {
                    folder: folder,
                    title: '',
                    description: '',
                    designer: '',
                    link: '',
                    hasThumbnail: fs.existsSync(thumbPath)
                };
                
                let currentSection = '';
                lines.forEach((line, index) => {
                    if (line.startsWith('제목:')) {
                        episode.title = line.substring(3).trim();
                        currentSection = '';
                    } else if (line.startsWith('설명:')) {
                        episode.description = line.substring(3).trim();
                        currentSection = 'description';
                    } else if (line.startsWith('디자이너:')) {
                        episode.designer = line.substring(5).trim();
                        currentSection = '';
                    } else if (line.startsWith('링크:')) {
                        episode.link = line.substring(3).trim();
                        currentSection = '';
                    } else if (line.trim() && currentSection === 'description') {
                        // 설명 섹션에 속한 빈 줄이 아닌 경우 줄바꿈 유지하여 추가
                        if (episode.description) {
                            episode.description += '\n' + line;
                        } else {
                            episode.description = line;
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
    const hasThumbnail = episode.hasThumbnail;
    const imageSrc = hasThumbnail 
        ? `asset/${episode.folder}/thumbnail.jpg`
        : '';
    const videoUrl = episode.link ? convertToEmbedUrl(episode.link) : '';
    
    // 이미지/영상 부분
    let imageHTML = '';
    if (hasThumbnail) {
        imageHTML = `<img src="${imageSrc}" alt="${episode.title}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 4px;">`;
    } else if (videoUrl) {
        imageHTML = `<iframe 
                    src="${videoUrl}" 
                    frameborder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowfullscreen>
                </iframe>`;
    } else {
        imageHTML = `<div class="episode-image-content">
                    <div class="image-decoration top"></div>
                    <div class="image-text">
                        ✶<br>
                        O F<br>
                        H U M A N<br>
                        <br>
                        L I V E S
                    </div>
                    <div class="image-decoration bottom"></div>
                    <div class="image-bg"></div>
                </div>`;
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
    
    return `        <div class="episode">
            <div class="episode-content">
                <h2 class="episode-title">${episode.title}</h2>
                <p class="episode-description" data-full-text="${fullText.replace(/"/g, '&quot;').replace(/\n/g, '\\n')}" data-designer="${episode.designer ? episode.designer.replace(/"/g, '&quot;') : ''}"></p>
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

