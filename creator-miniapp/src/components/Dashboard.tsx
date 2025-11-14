import { useEffect, useState } from 'react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface UserData {
  telegramId: string;
  walletAddress?: string;
  totalEarned: number;
}

interface Stats {
  totalPosts: number;
  totalEarnings: number;
  totalViews: number;
  totalPurchases: number;
}

interface DashboardProps {
  userData: UserData | null;
}

function Dashboard({ userData }: DashboardProps) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  
  const tg = window.Telegram?.WebApp;

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const userId = tg?.initDataUnsafe?.user?.id?.toString();
      
      if (!userId) return;

      const response = await axios.get(`${API_BASE_URL}/creator/stats`, {
        params: { userId },
      });

      setStats(response.data);
    } catch (err) {
      console.error('Error loading stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Loading stats...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="quick-stats">
        <div className="quick-stat-card">
          <div className="quick-stat-value">{stats?.totalPosts || 0}</div>
          <div className="quick-stat-label">Total Posts</div>
        </div>
        <div className="quick-stat-card">
          <div className="quick-stat-value">{stats?.totalPurchases || 0}</div>
          <div className="quick-stat-label">Purchases</div>
        </div>
        <div className="quick-stat-card">
          <div className="quick-stat-value">{stats?.totalViews || 0}</div>
          <div className="quick-stat-label">Total Views</div>
        </div>
        <div className="quick-stat-card">
          <div className="quick-stat-value">
            {stats?.totalEarnings.toFixed(2) || '0.00'}
          </div>
          <div className="quick-stat-label">TON Earned</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>💰 Earnings Overview</h2>
          <p>Your creator earnings</p>
        </div>
        <div className="card-body">
          <div className="info-item">
            <span className="label">Total Earned (95%)</span>
            <span className="value">{userData?.totalEarned.toFixed(4) || '0.0000'} TON</span>
          </div>
          <div className="info-item">
            <span className="label">Wallet Address</span>
            <span className="value" style={{ fontSize: '12px' }}>
              {userData?.walletAddress 
                ? `${userData.walletAddress.slice(0, 8)}...${userData.walletAddress.slice(-6)}`
                : 'Not connected'}
            </span>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="alert alert-info">
            <div>
              ℹ️ <strong>Creator Benefits</strong>
              <p style={{ marginTop: '8px', fontSize: '13px' }}>
                • Earn 95% of all post payments<br />
                • Payments sent directly to your wallet<br />
                • Real-time transaction verification<br />
                • Full control over your content
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
