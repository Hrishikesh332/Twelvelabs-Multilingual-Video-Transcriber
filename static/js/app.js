document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('upload-form');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }
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
        console.log('Server response:', data);

        if (response.ok && data.status === 'ready') {
            updateStatus('Processing complete!', 'success');
            showResult();
            displayTranscript(data.transcript);
            displayVideo(data.video_path);
        } else {
            throw new Error(data.message || 'An error occurred during processing');
        }
    } catch (error) {
        console.error('Error:', error);
        updateStatus(`Error: ${error.message}`, 'error');
    }
}

function parseTranscript(transcript) {
    console.log('Raw transcript:', transcript);
    const entries = [];
    
    if (!transcript) {
        console.error('Empty transcript received');
        return entries;
    }

    const lines = transcript
        .trim()
        .split('\n')
        .filter(line => line.trim())
        .filter(line => !line.startsWith('This translation'));

    lines.forEach((line, index) => {
        const timePatterns = [
            /^(\d+)s\s*-\s*(\d+)s:\s*"?(.+?)"?$/,
            /^(\d+)s\s*~\s*(\d+)s:\s*"?(.+?)"?$/,
            /^(\d+):(\d+)\s*-?\s*(?:(\d+):(\d+))?\s*:?\s*"?(.+?)"?$/,
            /^(\d+)s:\s*"?(.+?)"?$/,
            /^(\d+)\s*[:-]\s*"?(.+?)"?$/
        ];

        let entry = null;
        
        for (const pattern of timePatterns) {
            const match = line.match(pattern);
            if (match) {
                if (match.length === 6) { // MM:SS - MM:SS format
                    const startMinutes = parseInt(match[1]);
                    const startSeconds = parseInt(match[2]);
                    const endMinutes = match[3] ? parseInt(match[3]) : startMinutes;
                    const endSeconds = match[4] ? parseInt(match[4]) : startSeconds + 15;
                    
                    entry = {
                        start: startMinutes * 60 + startSeconds,
                        end: endMinutes * 60 + endSeconds,
                        text: match[5].trim()
                    };
                } else if (match.length === 4) {
                    entry = {
                        start: parseInt(match[1]),
                        end: parseInt(match[2]),
                        text: match[3].trim()
                    };
                } else if (match.length === 3) { 
                    const startTime = parseInt(match[1]);
                    entry = {
                        start: startTime,
                        end: startTime + 15,
                        text: match[2].trim()
                    };
                }
                break;
            }
        }

        if (entry) {
            entry.text = entry.text
                .replace(/^["']|["']$/g, '') 
                .replace(/\s+/g, ' ')        
                .trim();
            
            entries.push(entry);
        }
    });

    entries.sort((a, b) => a.start - b.start);
    for (let i = 0; i < entries.length - 1; i++) {
        if (entries[i].end > entries[i + 1].start) {
            entries[i].end = entries[i + 1].start;
        }
    }

    console.log('Parsed entries:', entries);
    return entries;
}

function displayTranscript(transcript) {
    const transcriptDiv = document.getElementById('transcript');
    if (!transcriptDiv) return;

    transcriptDiv.innerHTML = '';
    const entries = parseTranscript(transcript);
    
    if (entries.length === 0) {
        transcriptDiv.innerHTML = '<p class="text-gray-500 text-center">No transcript data available</p>';
        return;
    }

    const transcriptContent = document.createElement('div');
    transcriptContent.className = 'space-y-4';

    entries.forEach((entry, index) => {
        const entryDiv = document.createElement('div');
        entryDiv.className = 'transcript-entry';
        entryDiv.dataset.index = index;
        entryDiv.innerHTML = `
            <span class="timestamp" data-start="${entry.start}" data-end="${entry.end}">
                ${formatTime(entry.start)}
            </span>
            <span class="transcript-text">${entry.text}</span>
        `;
        transcriptContent.appendChild(entryDiv);
    });

    transcriptDiv.appendChild(transcriptContent);

    transcriptDiv.querySelectorAll('.timestamp').forEach(timestamp => {
        timestamp.addEventListener('click', handleTimestampClick);
    });
}

function handleTimestampClick(e) {
    const video = document.querySelector('video');
    if (!video) return;

    const startTime = parseFloat(e.target.dataset.start);
    const endTime = parseFloat(e.target.dataset.end);

    video.currentTime = startTime;
    video.play();

    if (window.currentTimeUpdateHandler) {
        video.removeEventListener('timeupdate', window.currentTimeUpdateHandler);
    }


    window.currentTimeUpdateHandler = () => {
        if (video.currentTime >= endTime) {
            video.pause();
            video.removeEventListener('timeupdate', window.currentTimeUpdateHandler);
        }
    };
    video.addEventListener('timeupdate', window.currentTimeUpdateHandler);

    updateTranscriptHighlight(startTime);
}

function displayVideo(videoPath) {
    const videoContainer = document.getElementById('video-container');
    if (!videoContainer) return;

    videoContainer.innerHTML = `
        <video controls class="w-full h-full rounded-lg">
            <source src="${videoPath}" type="video/mp4">
            Your browser does not support the video tag.
        </video>
    `;

    const video = videoContainer.querySelector('video');
    if (video) {
        video.addEventListener('timeupdate', () => {
            updateTranscriptHighlight(video.currentTime);
        });

        video.addEventListener('error', (e) => {
            console.error('Video error:', e);
            updateStatus('Error loading video', 'error');
        });
    }
}

function updateTranscriptHighlight(currentTime) {
    const entries = document.querySelectorAll('.transcript-entry');
    
    entries.forEach(entry => {
        const timestamp = entry.querySelector('.timestamp');
        const start = parseFloat(timestamp.dataset.start);
        const end = parseFloat(timestamp.dataset.end);

        if (currentTime >= start && currentTime < end) {
            entry.classList.add('active');
            entry.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else {
            entry.classList.remove('active');
        }
    });
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function updateStatus(message, type) {
    const statusElement = document.getElementById('status');
    if (!statusElement) return;

    statusElement.textContent = message;
    statusElement.className = 'text-center text-xl font-semibold mb-8';
    statusElement.classList.remove('hidden');

    switch (type) {
        case 'loading':
            statusElement.classList.add('text-blue-600');
            break;
        case 'success':
            statusElement.classList.add('text-green-600');
            break;
        case 'error':
            statusElement.classList.add('text-red-600');
            break;
    }
}

function hideResult() {
    const resultElement = document.getElementById('result');
    if (resultElement) {
        resultElement.classList.add('hidden');
    }
}

function showResult() {
    const resultElement = document.getElementById('result');
    if (resultElement) {
        resultElement.classList.remove('hidden');
        resultElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function formatTranscriptForPDF(entries) {
    let formattedText = [];
    entries.forEach(entry => {
        const timestamp = entry.querySelector('.timestamp').innerText;
        const text = entry.querySelector('.transcript-text').innerText;
        formattedText.push(`${timestamp}: ${text}`);
    });
    return formattedText;
}

function downloadTranscript() {
    const transcriptEntries = document.querySelectorAll('.transcript-entry');
    if (!transcriptEntries.length) {
        console.error('No transcript content found');
        return;
    }

    try {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF();
        
        
        pdf.setFontSize(24);
        pdf.setTextColor(59, 130, 246);
        pdf.text('Video Transcript', 105, 20, null, null, 'center');

        pdf.setFontSize(12);
        pdf.setTextColor(52, 73, 94); 
        
        const formattedText = formatTranscriptForPDF(transcriptEntries);
        let y = 40;

        formattedText.forEach(line => {
            if (y > 280) { 
                pdf.addPage();
                y = 20;
            }
        
            const splitText = pdf.splitTextToSize(line, 180);
            pdf.text(splitText, 15, y);
            
            y += 7 * splitText.length + 3;
        });
        
        const date = new Date().toISOString().split('T')[0];
        pdf.save(`transcript_${date}.pdf`);

    } catch (error) {
        console.error('Error generating PDF:', error);
        alert('Error generating PDF. Please try again.');
    }
}

function addDownloadButton() {
    const transcriptSection = document.getElementById('transcript').parentElement;
    
    const existingButton = transcriptSection.querySelector('.download-button');
    if (existingButton) {
        existingButton.remove();
    }
    

    const downloadButton = document.createElement('button');
    downloadButton.className = 'download-button w-full mt-4 py-3 px-4 rounded-lg text-white font-medium transition-all duration-300 bg-gradient-to-r from-blue-500 to-purple-500 hover:shadow-lg hover:-translate-y-0.5';
    downloadButton.innerHTML = `
        <span class="flex items-center justify-center">
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
            </svg>
            Download Transcript
        </span>
    `;
    
    downloadButton.addEventListener('click', downloadTranscript);
    transcriptSection.appendChild(downloadButton);
}

function displayTranscript(transcript) {
    const transcriptDiv = document.getElementById('transcript');
    if (!transcriptDiv) return;

    transcriptDiv.innerHTML = '';
    const entries = parseTranscript(transcript);
    
    if (entries.length === 0) {
        transcriptDiv.innerHTML = '<p class="text-gray-500 text-center">No transcript data available</p>';
        return;
    }

    const transcriptContent = document.createElement('div');
    transcriptContent.className = 'space-y-4';

    entries.forEach((entry, index) => {
        const entryDiv = document.createElement('div');
        entryDiv.className = 'transcript-entry';
        entryDiv.dataset.index = index;
        entryDiv.innerHTML = `
            <span class="timestamp" data-start="${entry.start}" data-end="${entry.end}">
                ${formatTime(entry.start)}
            </span>
            <span class="transcript-text">${entry.text}</span>
        `;
        transcriptContent.appendChild(entryDiv);
    });

    transcriptDiv.appendChild(transcriptContent);

    transcriptDiv.querySelectorAll('.timestamp').forEach(timestamp => {
        timestamp.addEventListener('click', handleTimestampClick);
    });

    addDownloadButton();
}