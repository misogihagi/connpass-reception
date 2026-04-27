const loadingOverlay = document.getElementById('loading-overlay');
const statusIndicator = document.getElementById('status-indicator');
const statusIcon = document.getElementById('status-icon');
const statusTitle = document.getElementById('status-title');
const statusMessage = document.getElementById('status-message');
const statusTextContainer = document.querySelector('.status-text');

let isProcessing = false;

const icons = {
  waiting: '<circle cx="12" cy="12" r="10"></circle><path d="M12 6v6l4 2"></path>',
  success: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>',
  warning: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>',
  error: '<circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>'
};

function updateStatus(state, title, message) {
  statusIndicator.className = `status-indicator ${state}`;
  statusTextContainer.className = `status-text ${state}`;
  statusIcon.innerHTML = icons[state];
  statusTitle.textContent = title;
  statusMessage.textContent = message;
}

async function handleScan(url) {
  if (isProcessing) return;
  if (!url.startsWith('https://connpass.com/')) {
    updateStatus('error', '無効なQRコード', 'connpassの受付用QRコードではありません。');
    return;
  }

  isProcessing = true;
  loadingOverlay.classList.remove('hidden');

  try {
    const response = await fetch('/api/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });

    const data = await response.json();
    loadingOverlay.classList.add('hidden');

    if (data.success) {
      updateStatus(data.status === 'success' ? 'success' : 'warning',
        data.status === 'success' ? '受付完了！' : '受付済み',
        data.status === 'success' ? '参加者の受付が完了しました。' : 'この参加者はすでに受付されています。');
    } else {
      updateStatus('error', 'エラー', data.error || '受付に失敗しました。');
    }
  } catch (error) {
    loadingOverlay.classList.add('hidden');
    updateStatus('error', 'エラー', '通信に失敗しました。');
  }

  setTimeout(() => { isProcessing = false; }, 3000);
}

const scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 });
scanner.render(handleScan);

updateStatus('waiting', 'スキャン待機中', 'QRコードをカメラにかざしてください...');

