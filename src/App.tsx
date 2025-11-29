import { useState } from 'react'
import './App.css'

// We need to define the type constant used by the background script
const REQUEST_SUMMARY = "REQUEST_SUMMARY";
const REQUEST_ESSENCE = "REQUEST_ESSENCE"; // Added for essence extraction

function App() {
  const [summary, setSummary] = useState("「要約」または「本質」ボタンをクリックして処理を開始してください。");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');

  // Function to handle copying the summary text to the clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(summary);
      setCopyStatus('copied');
    } catch (e) {
      setCopyStatus('error');
      console.error("Failed to copy text:", e);
    }
    // Reset status after a short delay
    setTimeout(() => setCopyStatus('idle'), 2000);
  };

  // Function to request summarization from the background script
  // Function to request summarization or essence extraction from the background script
  const handleProcess = async (type: typeof REQUEST_SUMMARY | typeof REQUEST_ESSENCE) => {
    // Check for Chrome runtime availability
    if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.sendMessage) {
      setSummary("エラー: Chrome Runtime APIが利用できません。");
      setError(true);
      return;
    }

    setLoading(true);
    setError(false);
    const processName = type === REQUEST_SUMMARY ? "要約" : "本質抽出";
    setSummary(`${processName}を実行中...`);

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
        setSummary(`${processName}の応答取得に失敗しました。`);
        setError(true);
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "不明なエラーが発生しました。";
      setSummary(`エラー: ${errorMessage}`);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="summary-app-container">
      <h1>Gemini Summarizer</h1>
      <div className="button-group">
        <button
          onClick={() => handleProcess(REQUEST_SUMMARY)}
          disabled={loading}
        >
          {loading ? '処理中...' : '要約'}
        </button>
        <button
          onClick={() => handleProcess(REQUEST_ESSENCE)}
          disabled={loading}
          className="essence-button"
        >
          {loading ? '処理中...' : '本質'}
        </button>
      </div>
      
      {summary !== "「要約」または「本質」ボタンをクリックして処理を開始してください。" && !error && !loading && (
        <button
          onClick={handleCopy}
          className={`copy-button ${copyStatus}`}
        >
          {copyStatus === 'copied' ? 'コピー完了' : '結果をコピー'}
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
      <p className="note">GEMINI_API_KEYが環境変数に設定されていることを確認してください。</p>
    </div>
  )
}

export default App
