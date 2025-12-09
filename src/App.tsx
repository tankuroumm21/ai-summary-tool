import { useState, useCallback } from 'react'
import './App.css'

// We need to define the type constant used by the background script
const REQUEST_SUMMARY = "REQUEST_SUMMARY";
const REQUEST_ESSENCE = "REQUEST_ESSENCE"; // Added for essence extraction

// --- UI Text and Messages Definitions ---
const MESSAGES = {
  INITIAL: "要約または本質抽出を開始するには、いずれかのボタンをクリックしてください。",
  API_ERROR: "エラー: ChromeランタイムAPIが利用できません。",
  PROCESSING: (name: string) => `${name}処理中...`,
  RESPONSE_FAIL: (name: string) => `${name}の取得に失敗しました。`,
  UNKNOWN_ERROR: "不明なエラーが発生しました。",
  COPY_SUCCESS: "コピーしました",
  COPY_BUTTON: "結果をコピー",
  LOADING: "読み込み中...",
  SUMMARIZE_BUTTON: "要約する",
  ESSENCE_BUTTON: "本質を抽出する",
  NOTE: "環境変数にVITE_GEMINI_API_KEYが設定されていることを確認してください。",
};

function App() {
  const [summary, setSummary] = useState(MESSAGES.INITIAL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');

  // Function to handle copying the summary text to the clipboard
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(summary);
      setCopyStatus('copied');
    } catch (e) {
      setCopyStatus('error');
      console.error("Failed to copy text:", e);
    }
    // Reset status after a short delay
    setTimeout(() => setCopyStatus('idle'), 2000);
  }, [summary]);

  // Function to request summarization or essence extraction from the background script
  const handleProcess = useCallback(async (type: typeof REQUEST_SUMMARY | typeof REQUEST_ESSENCE) => {
    // Check for Chrome runtime availability
    if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.sendMessage) {
      setSummary(MESSAGES.API_ERROR);
      setError(true);
      return;
    }

    setLoading(true);
    setError(false);
    const processName = type === REQUEST_SUMMARY ? MESSAGES.SUMMARIZE_BUTTON : MESSAGES.ESSENCE_BUTTON;
    setSummary(MESSAGES.PROCESSING(processName));

    try {
      // Send message to the background service worker
      const response = await chrome.runtime.sendMessage({
        type: type
      });

      if (chrome.runtime.lastError) {
        // Handle errors in communication (e.g., service worker inactive)
        throw new Error(chrome.runtime.lastError.message);
      }

      if (response && response.summary) {
        setSummary(response.summary);
      } else {
        setSummary(MESSAGES.RESPONSE_FAIL(processName));
        setError(true);
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : MESSAGES.UNKNOWN_ERROR;
      setSummary(`エラー: ${errorMessage}`);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="summary-app-container">
      <h1>Gemini AIツール</h1>
      <div className="button-group">
        <button
          onClick={() => handleProcess(REQUEST_SUMMARY)}
          disabled={loading}
        >
          {loading ? MESSAGES.LOADING : MESSAGES.SUMMARIZE_BUTTON}
        </button>
        <button
          onClick={() => handleProcess(REQUEST_ESSENCE)}
          disabled={loading}
          className="essence-button"
        >
          {loading ? MESSAGES.LOADING : MESSAGES.ESSENCE_BUTTON}
        </button>
      </div>
      
      {summary !== MESSAGES.INITIAL && !error && !loading && (
        <button
          onClick={handleCopy}
          className={`copy-button ${copyStatus}`}
        >
          {copyStatus === 'copied' ? MESSAGES.COPY_SUCCESS : MESSAGES.COPY_BUTTON}
        </button>
      )}

      <div className={`summary-output ${error ? 'error' : ''}`}>
        {summary.split('\n').map((line, index) => (
          // Display bullet points or plain text
          line.startsWith('*') || line.startsWith('-') ? (
            <p key={index} style={{ margin: 0, paddingLeft: '10px', textIndent: '-10px' }}>{line}</p>
          ) : (
            <p key={index}>{line}</p>
          )
        ))}
      </div>
      <p className="note">{MESSAGES.NOTE}</p>
    </div>
  )
}

export default App
