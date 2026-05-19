import { FiUser, FiSearch } from "react-icons/fi";
import { Link, useNavigate, useLocation } from "react-router-dom";

function Header() {
    const navigate = useNavigate();
    const location = useLocation(); 
    const handleSearch = (e) => {
        const value = e.target.value;
        navigate(`${location.pathname}?search=${value}`);
    };

    return (
        <div className="header">
            <Link to="/" className="link">
                <img src="/ico.svg" alt="Logo" />
                <span className="issue-tracker">IssueTracker</span>
            </Link>

            <div className="search-container">
                <FiSearch className="search-icon" />
                <input
                    type="text"
                    className="search-input"
                    placeholder="Поиск задач, проектов..."
                    onChange={handleSearch}
                />
            </div>

            <Link to="/profile" className="user-button">
                <FiUser />
            </Link>
        </div>
    );
}

export default Header;