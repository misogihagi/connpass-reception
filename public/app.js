import QrScanner from 'https://unpkg.com/qr-scanner/qr-scanner.min.js';

const videoElem = document.getElementById('qr-video');
const loadingOverlay = document.getElementById('loading-overlay');
const statusIndicator = document.getElementById('status-indicator');
const statusIcon = document.getElementById('status-icon');
const statusTitle = document.getElementById('status-title');
const statusMessage = document.getElementById('status-message');
const statusTextContainer = document.querySelector('.status-text');
const resumeBtn = document.getElementById('resume-btn');

let scanner;
let isProcessing = false;

// SVG Icons
const icons = {
  waiting: '<circle cx="12" cy="12" r="10"></circle><path d="M12 6v6l4 2"></path>',
  success: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>',
  warning: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>',
  error: '<circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>'
};

function updateStatus(state, title, message) {
  statusIndicator.className = `status-indicator ${state}`;
  statusTextContainer.className = `status-text ${state}`;
  statusIcon.innerHTML = icons[state] || icons.waiting;
  statusTitle.textContent = title;
  statusMessage.textContent = message;
}

async function handleScan(result) {
  if (isProcessing) return;

  const url = result.data;

  // Basic validation for connpass check-in URL
  if (!url.startsWith('https://connpass.com/checkin/code/')) {
    isProcessing = true;
    scanner.stop();
    updateStatus('error', 'Invalid QR Code', 'This is not a valid Connpass check-in QR code.');
    resumeBtn.classList.remove('hidden');
    return;
  }

  isProcessing = true;
  scanner.stop();
  loadingOverlay.classList.remove('hidden');

  try {
    const response = await fetch('/api/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });

    const data = await response.json();
    loadingOverlay.classList.add('hidden');

    if (!data.success) {
      if (data.error === 'Not logged in') {
        updateStatus('error', 'Login Required', 'Admin is not logged in on the server browser.');
      } else {
        updateStatus('error', 'Error', data.error || 'Failed to process check-in.');
      }
    } else {
      if (data.status === 'success') {
        updateStatus('success', 'Checked In!', 'Participant successfully checked in.');
      } else if (data.status === 'already_checked_in') {
        updateStatus('warning', 'Already Checked In', 'This participant was already checked in.');
      } else {
        updateStatus('success', 'Check-in processed', 'Response received from Connpass.');
      }
    }
  } catch (error) {
    loadingOverlay.classList.add('hidden');
    updateStatus('error', 'Network Error', 'Failed to communicate with server.');
  }

  resumeBtn.classList.remove('hidden');
}

resumeBtn.addEventListener('click', () => {
  resumeBtn.classList.add('hidden');
  updateStatus('waiting', 'Ready to Scan', 'Waiting for a QR code...');
  isProcessing = false;
  scanner.start();
});

// Initialize Scanner
scanner = new QrScanner(
  videoElem,
  result => handleScan(result),
  {
    highlightScanRegion: true,
    highlightCodeOutline: true,
    returnDetailedScanResult: true
  }
);

scanner.start().catch(err => {
  console.error(err);
  updateStatus('error', 'Camera Error', err);
});
