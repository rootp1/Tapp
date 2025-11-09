import { useEffect, useState } from 'react';
import { TonConnectButton, useTonConnectUI, useTonAddress } from '@tonconnect/ui-react';
import axios from 'axios';
import './App.css';

interface PostData {
  postId: string;
  price: number;
  currency: string;
  teaserText: string;
  contentType: string;
  hasPurchased: boolean;
  views: number;
  purchases: number;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

function App() {
  const [postData, setPostData] = useState<PostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [tonConnectUI] = useTonConnectUI();
  const userFriendlyAddress = useTonAddress();

  const tg = window.Telegram?.WebApp;
  
  // Get postId from URL query params or Telegram WebApp start parameter
  const urlParams = new URLSearchParams(window.location.search);
  const postId = urlParams.get('postId') || tg?.initDataUnsafe?.start_param || null;

  useEffect(() => {
    // Initialize Telegram Mini App
    try {
      tg?.ready();
      tg?.expand();
      tg?.enableClosingConfirmation();
    } catch (e) {
      console.error('Failed to initialize Telegram Mini App:', e);
    }

    // Load post data
    if (postId) {
      loadPostData();
    } else {
      setError('No post ID provided');
      setLoading(false);
    }
  }, [postId]);

  const loadPostData = async () => {
    try {
      setLoading(true);
      const userId = tg?.initDataUnsafe?.user?.id?.toString();

      const response = await axios.get(`${API_BASE_URL}/posts/${postId}`, {
        params: { userId },
      });

      setPostData(response.data);
      setLoading(false);

      // If already purchased, notify and close
      if (response.data.hasPurchased) {
        tg?.showAlert('You have already purchased this content!');
        setTimeout(() => tg?.close(), 2000);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load post');
      setLoading(false);
    }
  };

  const handleUnlock = async () => {
    if (!postData || !userFriendlyAddress) {
      tg?.showAlert('Please connect your TON wallet first');
      return;
    }

    if (postData.hasPurchased) {
      tg?.showAlert('You have already purchased this content!');
      return;
    }

    try {
      setProcessing(true);
      const userId = tg?.initDataUnsafe?.user?.id?.toString();

      if (!userId) {
        throw new Error('User ID not found');
      }

      // Create payment transaction
      const createResponse = await axios.post(`${API_BASE_URL}/payments/create`, {
        postId,
        userId,
        walletAddress: userFriendlyAddress,
      });

      const { transactionId, amount, recipientAddress } = createResponse.data;

      // Prepare TON transaction
      const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 300, // 5 minutes
        messages: [
          {
            address: recipientAddress,
            amount: (amount * 1e9).toString(), // Convert to nanoTON
            // Payload must be base64 encoded or omitted - using comment instead
          },
        ],
      };

      // Send transaction via TON Connect
      const result = await tonConnectUI.sendTransaction(transaction);

      // Wait a bit for transaction to be confirmed
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Verify payment with backend
      const verifyResponse = await axios.post(`${API_BASE_URL}/payments/verify`, {
        transactionId,
        tonTransactionHash: result.boc, // Transaction hash
      });

      if (verifyResponse.data.success) {
        tg?.showAlert('Payment successful! Check your Telegram DM for the content.');
        setTimeout(() => tg?.close(), 2000);
      } else {
        throw new Error('Payment verification failed');
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      tg?.showAlert(
        err.response?.data?.error || err.message || 'Payment failed. Please try again.'
      );
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !postData) {
    return (
      <div className="container">
        <div className="error">
          <h2>Error</h2>
          <p>{error || 'Post not found'}</p>
          <button onClick={() => tg?.close()} className="btn btn-secondary">
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="card">
        <div className="card-header">
          <h1>Premium Content</h1>
          <div className="price-badge">
            {postData.price} {postData.currency}
          </div>
        </div>

        <div className="card-body">
          <div className="teaser">
            <h3>Preview</h3>
            <p>{postData.teaserText}</p>
          </div>

          <div className="content-info">
            <div className="info-item">
              <span className="label">Content Type:</span>
              <span className="value">{postData.contentType}</span>
            </div>
            <div className="info-item">
              <span className="label">Views:</span>
              <span className="value">{postData.views}</span>
            </div>
            <div className="info-item">
              <span className="label">Purchases:</span>
              <span className="value">{postData.purchases}</span>
            </div>
          </div>

          <div className="wallet-section">
            <TonConnectButton />
          </div>

          {userFriendlyAddress && !postData.hasPurchased && (
            <button
              className="btn btn-primary"
              onClick={handleUnlock}
              disabled={processing}
            >
              {processing ? (
                <>
                  <div className="spinner small"></div>
                  Processing...
                </>
              ) : (
                `Unlock for ${postData.price} TON`
              )}
            </button>
          )}

          {postData.hasPurchased && (
            <div className="alert alert-success">
              You have already purchased this content!
            </div>
          )}
        </div>

        <div className="card-footer">
          <p className="note">
            Secure payment powered by TON blockchain. Content will be delivered to your
            Telegram DM after payment confirmation.
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
