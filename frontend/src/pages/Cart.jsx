import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

function Cart() {
  const [cart, setCart] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCart();
  }, []);

  const fetchCart = async () => {
    try {
      const response = await axios.get('/api/cart');
      setCart(response.data);
    } catch (error) {
      console.error('Failed to fetch cart');
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (itemId, quantity) => {
    try {
      await axios.put(`/api/cart/${itemId}`, { quantity });
      fetchCart();
    } catch (error) {
      console.error('Failed to update quantity');
    }
  };

  const removeItem = async (itemId) => {
    try {
      await axios.delete(`/api/cart/${itemId}`);
      fetchCart();
    } catch (error) {
      console.error('Failed to remove item');
    }
  };

  if (loading) return <p>Loading cart...</p>;

  return (
    <div className="cart-page">
      <h1>Shopping Cart</h1>
      
      {cart.items.length === 0 ? (
        <div className="card" style={{ padding: 30, textAlign: 'center' }}>
          <p>Your cart is empty</p>
          <Link to="/" className="btn btn-primary" style={{ marginTop: 15, display: 'inline-block' }}>
            Continue Shopping
          </Link>
        </div>
      ) : (
        <>
          {cart.items.map(item => (
            <div key={item.id} className="cart-item">
              <img src={item.image} alt={item.name} />
              <div className="cart-item-details">
                <h3>{item.name}</h3>
                <p className="price">${item.price.toFixed(2)}</p>
                <div className="quantity-selector">
                  <button onClick={() => updateQuantity(item.id, item.quantity - 1)}>-</button>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                    min="1"
                  />
                  <button onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button>
                </div>
                <p>Subtotal: ${(item.price * item.quantity).toFixed(2)}</p>
              </div>
              <button className="btn btn-danger" onClick={() => removeItem(item.id)}>
                Remove
              </button>
            </div>
          ))}
          
          <div className="cart-total">
            {/* 🐛 BUG-001: Может показывать отрицательную сумму при quantity > 99 */}
            <h2>Total: ${cart.total.toFixed(2)}</h2>
            <button className="btn btn-primary" onClick={() => navigate('/checkout')}>
              Proceed to Checkout
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default Cart;