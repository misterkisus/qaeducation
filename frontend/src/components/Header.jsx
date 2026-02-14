import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="header">
      <Link to="/" className="header-logo">🛒 QA Shop</Link>
      
      <nav className="header-nav">
        <Link to="/">Products</Link>
        
        {user ? (
          <div className="header-user">
            <Link to="/cart">🛒 Cart</Link>
            <Link to="/profile">Profile</Link>
            {user.role === 'admin' && <Link to="/admin">Admin</Link>}
            <span>Hi, {user.name}</span>
            <button className="btn btn-secondary" onClick={handleLogout}>
              Logout
            </button>
          </div>
        ) : (
          <div className="header-user">
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </div>
        )}
      </nav>
    </header>
  );
}

export default Header;