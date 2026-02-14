import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

function AdminDashboard() {
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalOrders: 0,
    totalUsers: 0,
    totalRevenue: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get('/api/admin/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div className="admin-page">
      <h1>Admin Dashboard</h1>
      
      <div className="admin-nav">
        <Link to="/admin" className="btn btn-primary">Dashboard</Link>
        <Link to="/admin/products" className="btn btn-secondary">Products</Link>
        <Link to="/admin/orders" className="btn btn-secondary">Orders</Link>
      </div>
      
      <div className="stats-grid">
        <div className="stat-card">
          <h3>{stats.totalProducts}</h3>
          <p>Products</p>
        </div>
        <div className="stat-card">
          <h3>{stats.totalOrders}</h3>
          <p>Orders</p>
        </div>
        <div className="stat-card">
          <h3>{stats.totalUsers}</h3>
          <p>Users</p>
        </div>
        <div className="stat-card">
          <h3>${stats.totalRevenue.toFixed(2)}</h3>
          <p>Revenue</p>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;