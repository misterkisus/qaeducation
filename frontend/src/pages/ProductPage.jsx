import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

function ProductPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      const response = await axios.get(`/api/products/${id}`);
      setProduct(response.data);
    } catch (error) {
      console.error('Failed to fetch product');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      await axios.post('/api/cart/add', { productId: id, quantity });
      setMessage('Added to cart!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Failed to add to cart');
    }
  };

  if (loading) return <p>Loading...</p>;
  if (!product) return <p>Product not found</p>;

  return (
    <div className="product-page">
      <div>
        <img src={product.image} alt={product.name} className="product-image" />
      </div>
      
      <div className="product-details">
        <h1>{product.name}</h1>
        
        {/* 🐛 BUG-004: Категория не отображается (product.category undefined) */}
        {product.category && <p className="category">{product.category}</p>}
        {/* На странице списка категория есть, тут - нет */}
        
        <p className="price">${product.price?.toFixed(2)}</p>
        
        <p className="description">{product.description}</p>
        
        <p className={`stock ${product.stock < 10 ? 'low' : ''}`}>
          {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
        </p>
        
        {product.stock > 0 && (
          <>
            <div className="quantity-selector">
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))}>-</button>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                min="1"
                max={product.stock}
              />
              <button onClick={() => setQuantity(quantity + 1)}>+</button>
            </div>
            
            <button className="btn btn-primary" onClick={handleAddToCart}>
              Add to Cart
            </button>
          </>
        )}
        
        {message && (
          <p className={message.includes('Failed') ? 'error-message' : 'success-message'}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}

export default ProductPage;