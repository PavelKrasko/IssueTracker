import { FiUser, FiSearch } from "react-icons/fi"; 
import { Link } from "react-router-dom";

function Header() {
    return (
        <div className="header">
            <Link to="/" className="link">
                <img src="/src/ico/ico.svg" alt="Logo" />
                <span className="issue-tracker">IssueTracker</span>
            </Link>
            <div className="search-container">
                <FiSearch className="search-icon" />
                <input
                    type="text"
                    className="search-input"
                    placeholder="Поиск задач, проектов..."
                />
            </div>

            <Link to="/profile" className="user-button">
                <FiUser />
            </Link>
        </div>
    );
}

export default Header;