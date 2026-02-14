import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await axios.get('/api/admin/orders');
      setOrders(response.data);
    } catch (error) {
      console.error('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (orderId, status) => {
    try {
      await axios.put(`/api/admin/orders/${orderId}/status`, { status });
      fetchOrders();
    } catch (error) {
      console.error('Failed to update status');
    }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div className="admin-page">
      <h1>Manage Orders</h1>
      
      <div className="admin-nav">
        <Link to="/admin" className="btn btn-secondary">Dashboard</Link>
        <Link to="/admin/products" className="btn btn-secondary">Products</Link>
        <Link to="/admin/orders" className="btn btn-primary">Orders</Link>
      </div>

      <table className="admin-table">
        <thead>
          <tr>
            <th>Order ID</th>
            <th>Customer</th>
            <th>Items</th>
            <th>Total</th>
            <th>Status</th>
            <th>Payment</th>
            <th>Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.map(order => (
            <tr key={order.id}>
              <td>{order.id.slice(0, 8)}...</td>
              <td>
                <div>{order.user_name}</div>
                <div style={{ fontSize: '0.8rem', color: '#666' }}>{order.email}</div>
              </td>
              <td>{order.items.length} items</td>
              <td>${order.total.toFixed(2)}</td>
              <td>
                <select
                  value={order.status}
                  onChange={(e) => updateStatus(order.id, e.target.value)}
                  className={`status ${order.status}`}
                >
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                </select>
              </td>
              <td>
                <span className={`status ${order.payment_status}`}>
                  {order.payment_status}
                </span>
              </td>
              <td>{new Date(order.created_at).toLocaleDateString()}</td>
              <td>
                <button className="btn btn-secondary">View</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AdminOrders;