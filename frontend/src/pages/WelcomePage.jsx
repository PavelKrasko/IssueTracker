import React from 'react';
import { useNavigate } from 'react-router-dom';
import logoIcon from '../ico/ico.svg';
const WelcomePage = () => {
    const navigate = useNavigate();
    return (
        <div className="welcome-page">
            <nav className="welcome-nav">
                <div className="welcome-logo">
                    <img src={logoIcon} alt="IssueTracker" />
                    <span>IssueTracker</span>
                </div>
                <div className="welcome-nav-btns">
                    <button className="btn-auth-secondary" onClick={() => navigate('/login')}>
                        Войти
                    </button>
                    <button className="btn-auth-primary" onClick={() => navigate('/signup')}>
                        Регистрация
                    </button>
                </div>
            </nav>
            <main className="welcome-main">
                <div className="welcome-container">
                    <div className="welcome-content-left">
                        <h1 className="welcome-title">IssueTracker поможет команде двигаться быстрее</h1>
                        <p className="welcome-subtitle">
                            Единый источник для ваших задач, багов и планов.
                            Простой интерфейс для сложных решений.
                        </p>
                        <button className="btn-auth-primary" onClick={() => navigate('/signup')}>
                            Начать сейчас
                        </button>
                    </div>
                    <div className="welcome-content-right">
                        <div className="mockup-card">
                            <div className="mockup-header"></div>
                            <div className="mockup-line-1"></div>
                            <div className="mockup-line-2"></div>
                            <div className="mockup-line-3"></div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};
export default WelcomePage;