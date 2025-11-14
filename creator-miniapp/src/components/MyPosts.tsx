import { useEffect, useState } from 'react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface Post {
  postId: string;
  channelTitle: string;
  teaserText: string;
  price: number;
  views: number;
  purchases: number;
  totalEarnings: number;
  isActive: boolean;
  createdAt: string;
}

function MyPosts() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  
  const tg = window.Telegram?.WebApp;

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      setLoading(true);
      const userId = tg?.initDataUnsafe?.user?.id?.toString();
      
      if (!userId) return;

      const response = await axios.get(`${API_BASE_URL}/creator/posts`, {
        params: { userId },
      });

      setPosts(response.data);
    } catch (err) {
      console.error('Error loading posts:', err);
      tg?.showAlert('Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivatePost = async (postId: string) => {
    tg?.showConfirm('Are you sure you want to deactivate this post?', async (confirmed) => {
      if (!confirmed) return;

      try {
        await axios.post(`${API_BASE_URL}/creator/posts/${postId}/deactivate`);
        tg?.HapticFeedback.notificationOccurred('success');
        loadPosts();
      } catch (err) {
        console.error('Error deactivating post:', err);
        tg?.showAlert('Failed to deactivate post');
      }
    });
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Loading posts...</p>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="card">
        <div className="card-body">
          <div className="empty-state">
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
            <h3>No Posts Yet</h3>
            <p>Create your first premium post to get started!</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="post-list">
        {posts.map((post) => (
          <div key={post.postId} className="post-item">
            <div className="post-header">
              <div>
                <div className="post-title">
                  {post.teaserText.length > 50 
                    ? `${post.teaserText.substring(0, 50)}...` 
                    : post.teaserText}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  📢 {post.channelTitle}
                </div>
              </div>
              <div>
                <div className="post-price">{post.price} TON</div>
                <span className={`badge ${post.isActive ? 'badge-success' : 'badge-inactive'}`}>
                  {post.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            <div className="post-stats">
              <div className="post-stat">
                <span>👁️ {post.views} views</span>
              </div>
              <div className="post-stat">
                <span>🛒 {post.purchases} purchases</span>
              </div>
              <div className="post-stat">
                <span>💰 {post.totalEarnings.toFixed(2)} TON</span>
              </div>
            </div>

            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '8px' }}>
              Created: {new Date(post.createdAt).toLocaleDateString()}
            </div>

            {post.isActive && (
              <div className="action-buttons">
                <button 
                  className="btn btn-secondary"
                  onClick={() => handleDeactivatePost(post.postId)}
                >
                  Deactivate
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default MyPosts;
