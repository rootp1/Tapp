import { useEffect, useState } from 'react';
import { TonConnectButton, useTonAddress } from '@tonconnect/ui-react';
import axios from 'axios';
import './App.css';
import Dashboard from './components/Dashboard';
import CreatePost from './components/CreatePost';
import MyPosts from './components/MyPosts';
import WalletSetup from './components/WalletSetup';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

type Tab = 'dashboard' | 'create' | 'posts';

interface UserData {
  telegramId: string;
  walletAddress?: string;
  isCreator: boolean;
  totalEarned: number;
}

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<UserData | null>(null);
  const userFriendlyAddress = useTonAddress();
  
  const tg = window.Telegram?.WebApp;

  useEffect(() => {
    // Initialize Telegram Mini App
    try {
      tg?.ready();
      tg?.expand();
      tg?.enableClosingConfirmation();
    } catch (e) {
      console.error('Failed to initialize Telegram Mini App:', e);
    }

    loadUserData();
  }, []);

  // Sync wallet address to backend when connected
  useEffect(() => {
    if (userFriendlyAddress && userData && userData.walletAddress !== userFriendlyAddress) {
      syncWalletAddress(userFriendlyAddress);
    }
  }, [userFriendlyAddress, userData]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const userId = tg?.initDataUnsafe?.user?.id?.toString();
      
      if (!userId) {
        throw new Error('User ID not found');
      }

      const response = await axios.get(`${API_BASE_URL}/creator/profile`, {
        params: { userId },
      });

      setUserData(response.data);
      
      // Load wallet from localStorage if available
      const savedWallet = localStorage.getItem('creator_wallet');
      if (savedWallet && !response.data.walletAddress) {
        await syncWalletAddress(savedWallet);
      }
    } catch (err: any) {
      console.error('Error loading user data:', err);
      tg?.showAlert('Failed to load profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const syncWalletAddress = async (walletAddress: string) => {
    try {
      const userId = tg?.initDataUnsafe?.user?.id?.toString();
      if (!userId) return;

      await axios.post(`${API_BASE_URL}/creator/wallet`, {
        userId,
        walletAddress,
      });

      // Save to localStorage for persistence
      localStorage.setItem('creator_wallet', walletAddress);
      
      // Update local state
      setUserData(prev => prev ? { ...prev, walletAddress } : null);
      
      tg?.HapticFeedback.notificationOccurred('success');
    } catch (err) {
      console.error('Error syncing wallet:', err);
    }
  };

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    tg?.HapticFeedback.selectionChanged();
  };

  if (loading) {
    return (
      <div className="app-container">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading Creator Studio...</p>
        </div>
      </div>
    );
  }

  // Show wallet setup if no wallet connected
  if (!userData?.walletAddress && !userFriendlyAddress) {
    return (
      <div className="app-container">
        <WalletSetup onWalletConnected={loadUserData} />
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="header">
        <h1>🎨 Creator Studio</h1>
        <p>Manage your premium content</p>
        {userData?.walletAddress && (
          <div className="wallet-status">
            💼 {userData.walletAddress.slice(0, 6)}...{userData.walletAddress.slice(-4)}
          </div>
        )}
      </header>

      <div className="nav-tabs">
        <button
          className={`nav-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => handleTabChange('dashboard')}
        >
          📊 Dashboard
        </button>
        <button
          className={`nav-tab ${activeTab === 'create' ? 'active' : ''}`}
          onClick={() => handleTabChange('create')}
        >
          ✨ Create
        </button>
        <button
          className={`nav-tab ${activeTab === 'posts' ? 'active' : ''}`}
          onClick={() => handleTabChange('posts')}
        >
          📝 My Posts
        </button>
      </div>

      <div className="content-section">
        {activeTab === 'dashboard' && <Dashboard userData={userData} />}
        {activeTab === 'create' && <CreatePost onPostCreated={() => handleTabChange('posts')} />}
        {activeTab === 'posts' && <MyPosts />}
      </div>

      <div style={{ textAlign: 'center', marginTop: '20px', padding: '20px' }}>
        <TonConnectButton />
      </div>
    </div>
  );
}

export default App;
