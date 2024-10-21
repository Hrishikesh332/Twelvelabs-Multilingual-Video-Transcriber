document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('upload-form');
    const status = document.getElementById('status');
    const result = document.getElementById('result');
    const transcriptDiv = document.getElementById('transcript');
    const videoContainer = document.getElementById('video-container');
    const downloadButton = document.getElementById('download-transcript');

    form.addEventListener('submit', handleFormSubmit);
    transcriptDiv.addEventListener('click', handleTranscriptClick);
    downloadButton.addEventListener('click', downloadTranscript);
});

async function handleFormSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);

    updateStatus('Uploading file and processing...', 'loading');
    hideResult();

    try {
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (response.ok && data.status === 'ready') {
            updateStatus('Processing complete!', 'success');
            showResult();
            displayTranscript(data.transcript);
            displayVideo(data.video_path);
        } else {
            throw new Error(data.message || 'An error occurred during processing');
        }
    } catch (error) {
        updateStatus(`Error: ${error.message}`, 'error');
    }
}

function updateStatus(message, className) {
    const status = document.getElementById('status');
    status.textContent = message;
    status.className = `text-center text-lg font-semibold mb-4 ${className}`;
}

function hideResult() {
    document.getElementById('result').classList.add('hidden');
}

function showResult() {
    const resultElement = document.getElementById('result');
    resultElement.classList.remove('hidden');
    resultElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
}


function displayTranscript(transcript) {
    const transcriptDiv = document.getElementById('transcript');
    transcriptDiv.innerHTML = ''; 
    
    const entries = parseTranscript(transcript);
    const formattedTranscriptDiv = document.createElement('div');
    formattedTranscriptDiv.innerHTML = '<h3 class="text-2xl font-bold mb-4">Formatted Transcript:</h3>';
    formattedTranscriptDiv.innerHTML += entries.map(entry => 
        `<div class="transcript-entry">
            <button class="timestamp text-sm timestamp-box" data-start="${entry.start}" data-end="${entry.end}">
                ${formatTime(entry.start)} - ${formatTime(entry.end)}
            </button>
            <span class="transcript-text text-base text-black">${entry.text}</span>
        </div>`
    ).join('');
    transcriptDiv.appendChild(formattedTranscriptDiv);

    const timestamps = transcriptDiv.querySelectorAll('.timestamp');
    timestamps.forEach(timestamp => {
        timestamp.addEventListener('click', handleTimestampClick);
    });
    document.getElementById('download-transcript').classList.remove('hidden');
    
    document.getElementById('result').classList.remove('hidden');
}


function handleTimestampClick(e) {
    const startTime = parseFloat(e.target.dataset.start);
    const endTime = parseFloat(e.target.dataset.end);
    const video = document.querySelector('video');
    if (video) {
        video.currentTime = startTime;
        video.play();
        
        const checkTime = () => {
            if (video.currentTime >= endTime) {
                video.pause();
                video.removeEventListener('timeupdate', checkTime);
            }
        };
        video.addEventListener('timeupdate', checkTime);
    }
}


function parseTranscript(transcript) {
    const lines = transcript.split('\n');
    const entries = [];
    for (const line of lines) {
        const match = line.match(/(\d+)s\s*-\s*(\d+)s\s*:\s*(.+)/);
        if (match) {
            entries.push({
                start: parseInt(match[1]),
                end: parseInt(match[2]),
                text: match[3].trim()
            });
        }
    }
    return entries;
}

function handleTranscriptClick(e) {
    if (e.target.classList.contains('timestamp')) {
        const startTime = parseFloat(e.target.dataset.start);
        const endTime = parseFloat(e.target.dataset.end);
        const video = document.querySelector('video');
        if (video) {
            video.currentTime = startTime;
            video.play();
            
            const checkTime = () => {
                if (video.currentTime >= endTime) {
                    video.pause();
                    video.removeEventListener('timeupdate', checkTime);
                }
            };
            video.addEventListener('timeupdate', checkTime);
        }
    }
}

function displayVideo(videoPath) {
    const videoContainer = document.getElementById('video-container');
    videoContainer.innerHTML = `
        <video class="w-full h-full rounded-lg shadow-md" controls>
            <source src="${videoPath}" type="video/mp4">
            Your browser does not support the video tag.
        </video>
    `;
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}


function downloadTranscript() {
    const transcriptContent = document.getElementById('transcript').innerText;
    const lines = transcriptContent.split('\n');
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF();
    
    pdf.setFontSize(20);
    pdf.setTextColor(44, 62, 80); 
    pdf.text('Transcript', 105, 20, null, null, 'center');
    
    pdf.setFontSize(12);
    pdf.setTextColor(52, 73, 94); 
    let y = 40;
    lines.forEach(line => {
        if (y > 280) {
            pdf.addPage();
            y = 20;
        }
        const splitText = pdf.splitTextToSize(line, 180);
        pdf.text(splitText, 15, y);
        y += 7 * splitText.length;
    });
    
    pdf.save('transcript.pdf');
}

function updateTranscriptHighlight(currentTime) {
    const transcriptEntries = document.querySelectorAll('.transcript-entry');
    transcriptEntries.forEach(entry => {
        const timestamp = entry.querySelector('.timestamp');
        const start = parseFloat(timestamp.dataset.start);
        const end = parseFloat(timestamp.dataset.end);

        if (currentTime >= start && currentTime < end) {
            entry.classList.add('bg-yellow-100');
            entry.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
            entry.classList.remove('bg-yellow-100');
        }
    });
}

document.addEventListener('DOMNodeInserted', (event) => {
    if (event.target.tagName === 'VIDEO') {
        event.target.addEventListener('timeupdate', (e) => {
            updateTranscriptHighlight(e.target.currentTime);
        });
    }
});