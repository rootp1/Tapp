import { useState, useEffect } from 'react';
import axios from 'axios';
import './BackendStatus.css';

interface BackendStatusProps {
  apiUrl: string;
}

export const BackendStatus = ({ apiUrl }: BackendStatusProps) => {
  const [status, setStatus] = useState<'checking' | 'online' | 'offline' | 'waking'>('checking');
  const [responseTime, setResponseTime] = useState<number>(0);
  const [showStatus, setShowStatus] = useState<boolean>(false);

  const checkBackendHealth = async (isWakeUp = false) => {
    if (isWakeUp) {
      setStatus('waking');
    } else {
      setStatus('checking');
    }

    const startTime = Date.now();
    
    try {
      // Remove /api from the URL to get base URL
      const baseUrl = apiUrl.replace('/api', '');
      const response = await axios.get(`${baseUrl}/health`, {
        timeout: 15000, // 15 second timeout
      });

      const elapsed = Date.now() - startTime;
      setResponseTime(elapsed);

      if (response.status === 200) {
        setStatus('online');
        if (isWakeUp) {
          // Auto-hide after successful wake up
          setTimeout(() => setShowStatus(false), 3000);
        }
      } else {
        setStatus('offline');
      }
    } catch (error) {
      console.error('Backend health check failed:', error);
      setStatus('offline');
      setResponseTime(0);
    }
  };

  const handleWakeUp = () => {
    checkBackendHealth(true);
  };

  useEffect(() => {
    // Initial check
    checkBackendHealth();

    // Check every 30 seconds
    const interval = setInterval(() => {
      checkBackendHealth();
    }, 30000);

    return () => clearInterval(interval);
  }, [apiUrl]);

  const getStatusDisplay = () => {
    switch (status) {
      case 'checking':
        return { emoji: '🔍', text: 'Checking...', color: '#ffa500' };
      case 'online':
        return { 
          emoji: responseTime < 1000 ? '🟢' : responseTime < 3000 ? '🟡' : '🟠', 
          text: `Online (${responseTime}ms)`, 
          color: responseTime < 1000 ? '#00ff00' : responseTime < 3000 ? '#ffff00' : '#ffa500' 
        };
      case 'offline':
        return { emoji: '🔴', text: 'Offline', color: '#ff0000' };
      case 'waking':
        return { emoji: '⏳', text: 'Waking up...', color: '#00bfff' };
      default:
        return { emoji: '❓', text: 'Unknown', color: '#808080' };
    }
  };

  const statusDisplay = getStatusDisplay();

  return (
    <div className="backend-status-container">
      <button 
        className="status-toggle-btn"
        onClick={() => setShowStatus(!showStatus)}
        title="Check backend status"
      >
        <span className="status-emoji">{statusDisplay.emoji}</span>
      </button>

      {showStatus && (
        <div className="status-panel">
          <div className="status-header">
            <h3>Backend Status</h3>
            <button 
              className="close-btn"
              onClick={() => setShowStatus(false)}
            >
              ✕
            </button>
          </div>

          <div className="status-body">
            <div className="status-info">
              <span className="status-indicator" style={{ color: statusDisplay.color }}>
                {statusDisplay.emoji}
              </span>
              <span className="status-text">{statusDisplay.text}</span>
            </div>

            {status === 'offline' && (
              <div className="offline-message">
                <p>⚠️ Backend server is sleeping (Render free tier)</p>
                <button 
                  className="wake-up-btn"
                  onClick={handleWakeUp}
                >
                  🚀 Wake Up Server
                </button>
                <p className="wake-up-info">
                  This may take 30-60 seconds
                </p>
              </div>
            )}

            {status === 'waking' && (
              <div className="waking-message">
                <div className="spinner"></div>
                <p>Waking up the server...</p>
                <p className="wake-up-info">Please wait, this may take up to a minute</p>
              </div>
            )}

            {status === 'online' && responseTime > 3000 && (
              <div className="slow-message">
                <p>⚠️ Server was sleeping but is now awake!</p>
                <p className="wake-up-info">Performance should improve with usage</p>
              </div>
            )}

            <button 
              className="refresh-btn"
              onClick={() => checkBackendHealth()}
              disabled={status === 'checking' || status === 'waking'}
            >
              🔄 Refresh Status
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
