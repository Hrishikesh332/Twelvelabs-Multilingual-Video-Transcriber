document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('upload-form');
    const status = document.getElementById('status');
    const result = document.getElementById('result');
    const transcriptDiv = document.getElementById('transcript');
    const videoContainer = document.getElementById('video-container');

    form.addEventListener('submit', handleFormSubmit);
    transcriptDiv.addEventListener('click', handleTranscriptClick);
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
    document.getElementById('result').classList.remove('hidden');
}

function displayTranscript(transcript) {
    const transcriptDiv = document.getElementById('transcript');
    transcriptDiv.innerHTML = ''; 
    
    const rawResponseDiv = document.createElement('div');
    rawResponseDiv.className = 'mb-4 p-4 bg-gray-100 rounded';
    rawResponseDiv.innerHTML = '<h3 class="font-bold mb-2">Raw API Response:</h3>';

    const entries = parseTranscript(transcript);
    const formattedTranscriptDiv = document.createElement('div');
    formattedTranscriptDiv.innerHTML = '<h3 class="font-bold mb-2">Formatted Transcript:</h3>';
    formattedTranscriptDiv.innerHTML += entries.map(entry => 
        `<div class="transcript-entry">
            <button class="timestamp bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-2 rounded" data-start="${entry.start}" data-end="${entry.end}">
                ${formatTime(entry.start)} - ${formatTime(entry.end)}
            </button> 
            <span class="ml-2">${entry.text}</span>
        </div>`
    ).join('');
    transcriptDiv.appendChild(formattedTranscriptDiv);
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

document.addEventListener('DOMContentLoaded', () => {
    const result = document.getElementById('result');
    result.addEventListener('DOMNodeInserted', (event) => {
        if (event.target.tagName === 'VIDEO') {
            event.target.addEventListener('timeupdate', (e) => {
                updateTranscriptHighlight(e.target.currentTime);
            });
        }
    });
});