// ZXingBrowser is loaded as a plain UMD script in index.html
// and available here as the global `ZXingBrowser`.

const videoElem = document.getElementById('qr-video');
const loadingOverlay = document.getElementById('loading-overlay');
const statusIndicator = document.getElementById('status-indicator');
const statusIcon = document.getElementById('status-icon');
const statusTitle = document.getElementById('status-title');
const statusMessage = document.getElementById('status-message');
const statusTextContainer = document.querySelector('.status-text');
const resumeBtn = document.getElementById('resume-btn');

let controls = null;
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

function stopScanner() {
  if (controls) {
    controls.stop();
    controls = null;
  }
}

async function handleScan(url) {
  if (isProcessing) return;

  // Basic validation for connpass check-in URL
  if (!url.startsWith('https://connpass.com/checkin/code/')) {
    isProcessing = true;
    stopScanner();
    updateStatus('error', '無効なQRコード', 'Connpassの受付用QRコードではありません。');
    resumeBtn.classList.remove('hidden');
    return;
  }

  isProcessing = true;
  stopScanner();
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
        updateStatus('error', 'ログインが必要です', 'サーバーのブラウザでまだログインされていません。');
      } else {
        updateStatus('error', 'エラー', data.error || '受付処理に失敗しました。');
      }
    } else {
      if (data.status === 'success') {
        updateStatus('success', '受付完了！', '参加者の受付が完了しました。');
      } else if (data.status === 'already_checked_in') {
        updateStatus('warning', '受付済み', 'この参加者はすでに受付されています。');
      } else {
        updateStatus('success', '受付処理完了', 'Connpassからの応答を受信しました。');
      }
    }
  } catch (error) {
    loadingOverlay.classList.add('hidden');
    updateStatus('error', 'ネットワークエラー', 'サーバーとの通信に失敗しました。');
  }

  resumeBtn.classList.remove('hidden');
}

async function startScanner() {
  const codeReader = new ZXingBrowser.BrowserQRCodeReader();

  try {
    const videoInputDevices = await ZXingBrowser.BrowserCodeReader.listVideoInputDevices();

    if (videoInputDevices.length === 0) {
      updateStatus('error', 'カメラが見つかりません', '使用可能なカメラデバイスが検出されませんでした。');
      return;
    }

    // Use the first available device
    const selectedDeviceId = videoInputDevices[0].deviceId;
    console.log(`Starting scanner with device: ${videoInputDevices[0].label} (${selectedDeviceId})`);

    controls = await codeReader.decodeFromVideoDevice(
      selectedDeviceId,
      videoElem,
      (result, error) => {
        if (result && !isProcessing) {
          handleScan(result.getText());
        }
        // NotFoundException fires every frame when no QR is found – ignore it
      }
    );
  } catch (err) {
    console.error('Scanner error:', err);
    //updateStatus('error', 'カメラエラー', `エラーが発生しました: ${err.message || err}`);
  }
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    devices.forEach((device) => {
      updateStatus('error', 'カメラが見つかりません', `${device.kind}: ${device.label} id = ${device.deviceId}`);
      console.log(`${device.kind}: ${device.label} id = ${device.deviceId}`);
    });
  } catch (err) {
    updateStatus('error', 'カメラが見つかりません', `${err.name}: ${err.message}`);
  }
}

resumeBtn.addEventListener('click', () => {
  resumeBtn.classList.add('hidden');
  updateStatus('waiting', 'スキャン待機中', 'QRコードをカメラにかざしてください...');
  isProcessing = false;
  startScanner();
});

// Initialize
updateStatus('waiting', 'スキャン待機中', 'QRコードをカメラにかざしてください...');
startScanner();
