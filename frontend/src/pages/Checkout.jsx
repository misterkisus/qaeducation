import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function Checkout() {
  const [cart, setCart] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    shippingAddress: ''
  });

  useEffect(() => {
    fetchCart();
  }, []);

  const fetchCart = async () => {
    try {
      const response = await axios.get('/api/cart');
      setCart(response.data);
      if (response.data.items.length === 0) {
        navigate('/cart');
      }
    } catch (error) {
      console.error('Failed to fetch cart');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    let { name, value } = e.target;
    
    // Форматирование номера карты
    if (name === 'cardNumber') {
      value = value.replace(/\D/g, '').slice(0, 16);
      value = value.replace(/(\d{4})/g, '$1 ').trim();
    }
    
    // Форматирование даты
    if (name === 'expiryDate') {
      value = value.replace(/\D/g, '').slice(0, 4);
      if (value.length >= 2) {
        value = value.slice(0, 2) + '/' + value.slice(2);
      }
    }
    
    // CVV
    if (name === 'cvv') {
      value = value.replace(/\D/g, '').slice(0, 3);
    }
    
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setProcessing(true);

    try {
      const response = await axios.post('/api/orders/checkout', formData);
      setSuccess(`Order placed successfully! Order ID: ${response.data.orderId}`);
      
      // 🐛 BUG-003: После успешной оплаты корзина не очищается на сервере
      // Пользователь может нажать "Оплатить" повторно!
      
      setTimeout(() => {
        navigate('/profile');
      }, 3000);
    } catch (error) {
      setError(error.response?.data?.error || 'Payment failed');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div className="checkout-page">
      <div className="card">
        <h1>Checkout</h1>
        
        <div className="test-cards-info">
          <h4>🧪 Test Cards (Sandbox Mode)</h4>
          <p><code>4242 4242 4242 4242</code> - Success</p>
          <p><code>4000 0000 0000 0002</code> - Decline</p>
          <p><code>4000 0000 0000 9995</code> - Insufficient Funds</p>
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Card Number</label>
            <input
              type="text"
              name="cardNumber"
              value={formData.cardNumber}
              onChange={handleChange}
              placeholder="4242 4242 4242 4242"
              required
            />
          </div>

          <div style={{ display: 'flex', gap: 15 }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Expiry Date</label>
              <input
                type="text"
                name="expiryDate"
                value={formData.expiryDate}
                onChange={handleChange}
                placeholder="MM/YY"
                required
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>CVV</label>
              <input
                type="text"
                name="cvv"
                value={formData.cvv}
                onChange={handleChange}
                placeholder="123"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Shipping Address</label>
            <textarea
              name="shippingAddress"
              value={formData.shippingAddress}
              onChange={(e) => setFormData({ ...formData, shippingAddress: e.target.value })}
              placeholder="Enter your full shipping address"
              rows={3}
              required
            />
          </div>

          <div className="cart-total" style={{ textAlign: 'left', marginBottom: 20 }}>
            <h3>Order Total: ${cart.total.toFixed(2)}</h3>
          </div>

          <button 
            type="submit" 
            className="btn btn-success" 
            style={{ width: '100%' }}
            disabled={processing}
          >
            {processing ? 'Processing...' : `Pay $${cart.total.toFixed(2)}`}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Checkout;