import React, { useState } from 'react';
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from 'lucide-react';
import { FiHome } from "react-icons/fi";
import logo from '../ico/ico.svg';
import toast, { Toaster } from 'react-hot-toast';
export default function Login() {
    const [showPassword, setShowPassword] = useState(false);
    const [login, setLogin] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();
    const handleLogin = async (e) => {
        e.preventDefault();
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                login: login.trim(),
                password: password.trim()
            })
        });
        const data = await response.json();
        if (response.ok) {
            localStorage.setItem('userId', data.id || data.Id);
            toast.success("Вход выполнен!");
            setTimeout(() => {
                navigate('/home');
            }, 1000);
        } else if (response.status === 401) {
            toast.error("Неверный логин или пароль!");
        } else {
            toast.error("Ошибка при входе. Попробуйте позже.");
        }
    };

    return (
        <div className="auth-container">
            <Toaster position="top-center" />
            <div className="auth-card">
                <div className="auth-header">
                    <img src={logo} alt="Логотип" className="auth-logo" />
                    <h1 className="auth-app-name">IssueTracker</h1>
                </div>
                <h2 className="auth-subtitle">Вход в аккаунт</h2>

                <form className="auth-form" onSubmit={handleLogin}>
                    <input
                        type="email"
                        placeholder="Email"
                        className="auth-input"
                        required
                        value={login}
                        onChange={(e) => setLogin(e.target.value)}
                    />

                    <div className="password-field">
                        <input
                            type={showPassword ? "text" : "password"}
                            placeholder="Пароль"
                            className="auth-input"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <button
                            type="button"
                            className="password-toggle"
                            onClick={() => setShowPassword(!showPassword)}
                        >
                            {showPassword && <Eye size={20} />}
                            {!showPassword && <EyeOff size={20} />}
                        </button>
                    </div>

                    <button type="submit" className="auth-button">Войти</button>
                </form>

                <div className="auth-footer">
                    <p className="auth-signup-text">
                        Нет аккаунта? <Link to="/signup" className="auth-link">Зарегистрироваться</Link>
                    </p>
                    <Link to="/" className="auth-back-link">
                        <FiHome size={18} />
                        <span>На главную</span>
                    </Link>
                </div>
            </div>
        </div>
    );
}
