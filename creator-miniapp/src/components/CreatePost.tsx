import { useState, useEffect, useRef, ChangeEvent } from 'react';
import { useTonAddress } from '@tonconnect/ui-react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface Channel {
  channelId: string;
  channelTitle: string;
  totalPosts: number;
  totalEarnings: number;
}

interface CreatePostProps {
  onPostCreated: () => void;
}

type Step = 'channel' | 'details' | 'preview' | 'content';

function CreatePost({ onPostCreated }: CreatePostProps) {
  const [step, setStep] = useState<Step>('channel');
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [price, setPrice] = useState('');
  const [teaserText, setTeaserText] = useState('');
  const [contentText, setContentText] = useState('');
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [contentFile, setContentFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const previewInputRef = useRef<HTMLInputElement>(null);
  const contentInputRef = useRef<HTMLInputElement>(null);
  const userFriendlyAddress = useTonAddress();
  const tg = window.Telegram?.WebApp;

  useEffect(() => {
    loadChannels();
  }, []);

  const loadChannels = async () => {
    try {
      const userId = tg?.initDataUnsafe?.user?.id?.toString();
      if (!userId) return;

      const response = await axios.get(`${API_BASE_URL}/creator/channels`, {
        params: { userId },
      });

      setChannels(response.data);
    } catch (err) {
      setError('Failed to load channels');
      console.error(err);
    }
  };

  const handleChannelSelect = (channel: Channel) => {
    setSelectedChannel(channel);
    setStep('details');
    tg?.HapticFeedback.selectionChanged();
  };

  const handleDetailsNext = () => {
    if (!price || parseFloat(price) < 0.1 || parseFloat(price) > 1000) {
      tg?.showAlert('Price must be between 0.1 and 1000 TON');
      return;
    }
    if (!teaserText || teaserText.length < 10) {
      tg?.showAlert('Teaser text must be at least 10 characters');
      return;
    }
    setStep('preview');
    tg?.HapticFeedback.notificationOccurred('success');
  };

  const handlePreviewNext = () => {
    setStep('content');
  };

  const handlePreviewFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPreviewFile(file);
      tg?.HapticFeedback.selectionChanged();
    }
  };

  const handleContentFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setContentFile(file);
      tg?.HapticFeedback.selectionChanged();
    }
  };

  const handleSubmit = async () => {
    if (!selectedChannel || !userFriendlyAddress) {
      tg?.showAlert('Missing required information');
      return;
    }

    if (!contentText && !contentFile) {
      tg?.showAlert('Please provide content (text or file)');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const formData = new FormData();
      formData.append('userId', tg?.initDataUnsafe?.user?.id?.toString() || '');
      formData.append('channelId', selectedChannel.channelId);
      formData.append('channelTitle', selectedChannel.channelTitle);
      formData.append('price', price);
      formData.append('teaserText', teaserText);
      formData.append('walletAddress', userFriendlyAddress);

      if (previewFile) {
        formData.append('preview', previewFile);
      }

      if (contentFile) {
        formData.append('content', contentFile);
        formData.append('contentType', contentFile.type.startsWith('image') ? 'photo' : 'document');
      } else {
        formData.append('contentType', 'text');
        formData.append('contentData', contentText);
      }

      const response = await axios.post(`${API_BASE_URL}/creator/posts`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      tg?.HapticFeedback.notificationOccurred('success');
      tg?.showAlert('Post created successfully! 🎉', () => {
        onPostCreated();
      });

    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create post');
      tg?.HapticFeedback.notificationOccurred('error');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => {
    const steps = [
      { key: 'channel', label: 'Channel' },
      { key: 'details', label: 'Details' },
      { key: 'preview', label: 'Preview' },
      { key: 'content', label: 'Content' },
    ];

    const currentIndex = steps.findIndex(s => s.key === step);

    return (
      <div className="step-indicator">
        {steps.map((s, index) => (
          <div key={s.key} className={`step ${index === currentIndex ? 'active' : ''} ${index < currentIndex ? 'completed' : ''}`}>
            <div className="step-circle">
              {index < currentIndex ? '✓' : index + 1}
            </div>
            <div className="step-label">{s.label}</div>
            {index < steps.length - 1 && <div className="step-line"></div>}
          </div>
        ))}
      </div>
    );
  };

  if (channels.length === 0 && !loading) {
    return (
      <div className="card">
        <div className="card-body">
          <div className="empty-state">
            <h3>No Channels Found</h3>
            <p>Add your bot as an admin to your Telegram channel first</p>
            <div className="alert alert-info" style={{ marginTop: '20px', textAlign: 'left' }}>
              <div>
                <strong>How to add the bot:</strong>
                <p style={{ marginTop: '8px', fontSize: '13px' }}>
                  1. Go to your Telegram channel<br />
                  2. Add the bot as administrator<br />
                  3. Grant "Post Messages" permission<br />
                  4. Refresh this page
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {renderStepIndicator()}

      {error && (
        <div className="alert alert-error">
          ⚠️ {error}
        </div>
      )}

      {step === 'channel' && (
        <div className="card">
          <div className="card-header">
            <h2>📢 Select Channel</h2>
            <p>Choose where to publish</p>
          </div>
          <div className="card-body">
            <div className="channel-list">
              {channels.map((channel) => (
                <div
                  key={channel.channelId}
                  className={`channel-item ${selectedChannel?.channelId === channel.channelId ? 'selected' : ''}`}
                  onClick={() => handleChannelSelect(channel)}
                >
                  <h3>{channel.channelTitle}</h3>
                  <div className="channel-stats">
                    <span>📝 {channel.totalPosts} posts</span>
                    <span>💰 {channel.totalEarnings.toFixed(2)} TON</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 'details' && (
        <div className="card">
          <div className="card-header">
            <h2>💎 Post Details</h2>
            <p>Set price and teaser</p>
          </div>
          <div className="card-body">
            <div className="form-group">
              <label>Price (TON)</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                max="1000"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="e.g., 1.5"
              />
              <div className="form-hint">Min: 0.1 TON, Max: 1000 TON</div>
            </div>

            <div className="form-group">
              <label>Teaser Text</label>
              <textarea
                value={teaserText}
                onChange={(e) => setTeaserText(e.target.value)}
                placeholder="What users will see before unlocking..."
                maxLength={500}
              />
              <div className="form-hint">{teaserText.length}/500 characters</div>
            </div>

            <button className="btn btn-primary" onClick={handleDetailsNext}>
              Next: Add Preview
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={() => setStep('channel')}
              style={{ marginTop: '10px' }}
            >
              Back
            </button>
          </div>
        </div>
      )}

      {step === 'preview' && (
        <div className="card">
          <div className="card-header">
            <h2>🖼️ Preview Media (Optional)</h2>
            <p>Add a preview image/video</p>
          </div>
          <div className="card-body">
            <div 
              className={`file-upload ${previewFile ? 'has-file' : ''}`}
              onClick={() => previewInputRef.current?.click()}
            >
              <input
                type="file"
                ref={previewInputRef}
                accept="image/*,video/*"
                onChange={handlePreviewFileChange}
              />
              {previewFile ? (
                <>
                  <div>✅ File Selected</div>
                  <div className="file-info">
                    <span className="file-name">{previewFile.name}</span>
                    <button onClick={(e) => {
                      e.stopPropagation();
                      setPreviewFile(null);
                    }}>
                      ❌
                    </button>
                  </div>
                </>
              ) : (
                <div>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>📸</div>
                  <div>Click to upload preview</div>
                  <div style={{ fontSize: '12px', marginTop: '4px', opacity: 0.7 }}>
                    Image or Video
                  </div>
                </div>
              )}
            </div>

            <button className="btn btn-primary" onClick={handlePreviewNext} style={{ marginTop: '20px' }}>
              Next: Add Content
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={() => setStep('details')}
              style={{ marginTop: '10px' }}
            >
              Back
            </button>
          </div>
        </div>
      )}

      {step === 'content' && (
        <div className="card">
          <div className="card-header">
            <h2>📦 Premium Content</h2>
            <p>The content users will unlock</p>
          </div>
          <div className="card-body">
            <div className="form-group">
              <label>Content Text</label>
              <textarea
                value={contentText}
                onChange={(e) => setContentText(e.target.value)}
                placeholder="Premium content text (or upload a file below)..."
                rows={6}
              />
            </div>

            <div style={{ textAlign: 'center', margin: '16px 0', color: 'var(--text-secondary)' }}>
              - OR -
            </div>

            <div 
              className={`file-upload ${contentFile ? 'has-file' : ''}`}
              onClick={() => contentInputRef.current?.click()}
            >
              <input
                type="file"
                ref={contentInputRef}
                accept="image/*,video/*,application/pdf,.doc,.docx"
                onChange={handleContentFileChange}
              />
              {contentFile ? (
                <>
                  <div>✅ File Selected</div>
                  <div className="file-info">
                    <span className="file-name">{contentFile.name}</span>
                    <button onClick={(e) => {
                      e.stopPropagation();
                      setContentFile(null);
                    }}>
                      ❌
                    </button>
                  </div>
                </>
              ) : (
                <div>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>📎</div>
                  <div>Click to upload content file</div>
                  <div style={{ fontSize: '12px', marginTop: '4px', opacity: 0.7 }}>
                    Image, Video, PDF, or Document
                  </div>
                </div>
              )}
            </div>

            <div className="preview-container">
              <strong>Post Preview:</strong>
              <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(147, 51, 234, 0.1)', borderRadius: '8px' }}>
                <div style={{ marginBottom: '8px' }}>
                  <strong>💰 {price} TON</strong>
                </div>
                <div style={{ fontSize: '14px' }}>{teaserText}</div>
                {previewFile && (
                  <div style={{ marginTop: '8px', fontSize: '12px', opacity: 0.7 }}>
                    📸 Preview: {previewFile.name}
                  </div>
                )}
              </div>
            </div>

            <button 
              className="btn btn-primary" 
              onClick={handleSubmit}
              disabled={loading}
              style={{ marginTop: '20px' }}
            >
              {loading ? 'Creating Post...' : '✨ Publish Post'}
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={() => setStep('preview')}
              style={{ marginTop: '10px' }}
              disabled={loading}
            >
              Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default CreatePost;
