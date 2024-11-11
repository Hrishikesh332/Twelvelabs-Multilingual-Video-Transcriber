document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('upload-form');
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const selectedFile = document.getElementById('selected-file');
    const filenameDisplay = document.getElementById('filename-display');
    const removeFileButton = document.getElementById('remove-file');
    const uploadPrompt = document.getElementById('upload-prompt');

    // Set up event listeners
    if (form) form.addEventListener('submit', handleFormSubmit);
    if (dropZone) setupDragAndDrop(dropZone);
    if (fileInput) fileInput.addEventListener('change', handleFileSelect);
    if (removeFileButton) removeFileButton.addEventListener('click', handleFileRemove);

    // Drag and drop setup
    function setupDragAndDrop(dropZone) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, preventDefaults, false);
            document.body.addEventListener(eventName, preventDefaults, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, highlight, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, unhighlight, false);
        });

        dropZone.addEventListener('drop', handleDrop, false);
    }

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    function highlight(e) {
        dropZone.classList.add('border-blue-500', 'bg-blue-50');
    }

    function unhighlight(e) {
        dropZone.classList.remove('border-blue-500', 'bg-blue-50');
    }

    // File handling functions
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;

        handleFiles(files);
    }

    function handleFileSelect(e) {
        const files = e.target.files;
        handleFiles(files);
    }

    function handleFiles(files) {
        if (files.length > 0) {
            const file = files[0];
            if (validateFile(file)) {
                displayFileInfo(file);
                fileInput.files = files;
            }
        }
    }

    function validateFile(file) {
        const validTypes = ['video/mp4', 'video/avi', 'video/quicktime'];
        const maxSize = 100 * 1024 * 1024; // 100MB

        if (!validTypes.includes(file.type)) {
            updateStatus('Please select a valid video file (MP4, AVI, or MOV)', 'error');
            return false;
        }

        if (file.size > maxSize) {
            updateStatus('File size must be less than 100MB', 'error');
            return false;
        }

        return true;
    }

    function displayFileInfo(file) {
        filenameDisplay.textContent = file.name;
        selectedFile.classList.remove('hidden');
        uploadPrompt.textContent = 'File selected';
    }

    function handleFileRemove(e) {
        e.preventDefault();
        fileInput.value = '';
        selectedFile.classList.add('hidden');
        uploadPrompt.textContent = 'Choose a video or drag it here';
        updateStatus('', '');
    }

    // Form submission handling
    async function handleFormSubmit(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        if (!fileInput.files || !fileInput.files[0]) {
            updateStatus('Please select a file first', 'error');
            return;
        }

        const loadingOverlay = document.getElementById('loading-overlay');
        loadingOverlay.classList.remove('hidden');
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
        } finally {
            loadingOverlay.classList.add('hidden');
        }
    }

    function parseTranscript(transcript) {
        console.log('Raw transcript:', transcript);
        const entries = new Map();
        
        if (!transcript) {
            console.error('Empty transcript received');
            return [];
        }
    
        // Try to extract data from JSON response and handle escapes
        let transcriptText = transcript;
        try {
            if (typeof transcript === 'string' && (transcript.includes('"id":') || transcript.includes("'id':"))) {
                const dataMatch = transcript.match(/['"]data['"]\s*:\s*['"]([^]+?)['"]\s*$/);
                if (dataMatch && dataMatch[1]) {
                    transcriptText = dataMatch[1]
                        .replace(/\\n/g, '\n')
                        .replace(/\\'/g, "'")
                        .replace(/\\"/g, '"')
                        .replace(/\\\\/g, '\\');
                }
            }
        } catch (e) {
            console.error('Error parsing JSON response:', e);
        }
    
        // Different timestamp patterns
        const patterns = [
            // HH:MM - HH:MM : "text"
            /(\d{2}):(\d{2})\s*-\s*(\d{2}):(\d{2})\s*:\s*["']([^"']+)["']/g,
            // HH:MM - HH:MM: text
            /(\d{2}):(\d{2})\s*-\s*(\d{2}):(\d{2})\s*:\s*([^"\n]+)/g,
            // Simple format with quotes
            /(\d{2}):(\d{2})\s*-\s*(\d{2}):(\d{2})\s*["']([^"']+)["']/g
        ];
    
        // Try each pattern
        for (const pattern of patterns) {
            let match;
            while ((match = pattern.exec(transcriptText)) !== null) {
                try {
                    const [_, startMin, startSec, endMin, endSec, text] = match;
                    
                    const startTime = parseInt(startMin) * 60 + parseInt(startSec);
                    const endTime = parseInt(endMin) * 60 + parseInt(endSec);
    
                    // Skip invalid timestamps
                    if (isNaN(startTime) || isNaN(endTime)) continue;
    
                    const cleanText = text
                        .replace(/^["'\s]+|["'\s]+$/g, '')
                        .replace(/\\n/g, ' ')
                        .replace(/\*\*/g, '')
                        .replace(/\\'/g, "'")
                        .replace(/\\"/g, '"')
                        .replace(/\\\\/g, '\\')
                        .replace(/\s+/g, ' ')
                        .trim();
    
                    if (cleanText && !cleanText.includes('Note:')) {
                        const key = `${startTime}-${cleanText.substring(0, 50)}`;
                        entries.set(key, {
                            start: startTime,
                            end: endTime,
                            text: cleanText
                        });
                    }
                } catch (e) {
                    console.error('Error processing match:', e);
                    continue;
                }
            }
        }
    
        // Convert Map to Array and sort by start time
        const sortedEntries = Array.from(entries.values())
            .sort((a, b) => a.start - b.start);
    
        console.log('Parsed entries:', sortedEntries);
        return sortedEntries;
    }
    
    function displayTranscript(transcript) {
        const transcriptDiv = document.getElementById('transcript');
        if (!transcriptDiv) return;
    
        transcriptDiv.innerHTML = '';
        let entries = [];
    
        try {
            entries = parseTranscript(transcript);
        } catch (error) {
            console.error('Error parsing transcript:', error);
            transcriptDiv.innerHTML = `
                <div class="p-4 text-center">
                    <p class="text-red-500">Error parsing transcript. Raw data:</p>
                    <pre class="mt-2 p-2 bg-gray-50 rounded text-sm text-left whitespace-pre-wrap">${
                        typeof transcript === 'string' ? 
                        transcript.replace(/</g, '&lt;').replace(/>/g, '&gt;') : 
                        JSON.stringify(transcript, null, 2)
                    }</pre>
                </div>`;
            return;
        }
        
        if (entries.length === 0) {
            try {
                // Try to extract any text between timestamps
                const timestampMatch = transcript.match(/\d{2}:\d{2}\s*-\s*\d{2}:\d{2}\s*:?\s*["']?([^"'\n]+)["']?/);
                if (timestampMatch) {
                    entries = [{
                        start: 0,
                        end: 30,
                        text: timestampMatch[1].trim()
                    }];
                }
            } catch (e) {
                console.error('Fallback parsing failed:', e);
            }
            
            if (entries.length === 0) {
                transcriptDiv.innerHTML = `
                    <div class="p-4 text-center">
                        <p class="text-gray-500">No transcript data available</p>
                    </div>`;
                return;
            }
        }
    
        const transcriptContent = document.createElement('div');
        transcriptContent.className = 'space-y-4';
    
        entries.forEach((entry, index) => {
            const entryDiv = document.createElement('div');
            entryDiv.className = 'transcript-entry p-4 rounded-lg border border-gray-200 hover:shadow-md transition-all';
            entryDiv.dataset.index = index;
    
            try {
                entryDiv.innerHTML = `
                    <span class="timestamp inline-block px-3 py-1 rounded-md bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm cursor-pointer" 
                          data-start="${entry.start}" 
                          data-end="${entry.end}">
                        ${formatTime(entry.start)} - ${formatTime(entry.end)}
                    </span>
                    <span class="transcript-text ml-3">${entry.text}</span>
                `;
            } catch (error) {
                console.error('Error creating entry div:', error);
                entryDiv.innerHTML = `<p class="text-red-500">Error displaying entry</p>`;
            }
    
            transcriptContent.appendChild(entryDiv);
        });
    
        transcriptDiv.appendChild(transcriptContent);
    
        // Add click handlers for timestamps
        transcriptDiv.querySelectorAll('.timestamp').forEach(timestamp => {
            timestamp.addEventListener('click', handleTimestampClick);
        });
    
        addDownloadButton();
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

    // Utility functions
    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    function updateStatus(message, type) {
        const statusElement = document.getElementById('status');
        if (!statusElement) return;

        if (!message) {
            statusElement.classList.add('hidden');
            return;
        }

        statusElement.textContent = message;
        statusElement.className = 'status-message';
        statusElement.classList.remove('hidden', 'loading', 'success', 'error');

        if (type) {
            statusElement.classList.add(type);
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

    function formatTranscriptForPDF(entries) {
        return Array.from(entries).map(entry => {
            const timestamp = entry.querySelector('.timestamp').innerText;
            const text = entry.querySelector('.transcript-text').innerText;
            return `${timestamp}: ${text}`;
        });
    }
});