import React, { useState } from 'react';
import { Link } from "react-router-dom";
import { Eye, EyeOff } from 'lucide-react';
import { FiHome } from "react-icons/fi";
import logo from '../ico/ico.svg';
import toast, { Toaster } from 'react-hot-toast';
export default function Register() {
    const [showPassword, setShowPassword] = useState(false);
    const [login, setLogin] = useState('');
    const [password, setPassword] = useState('');
    const handleRegister = async (e) => {
        e.preventDefault();
        const response = await fetch('https://localhost:7023/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ login, password })
        });
        if (response.ok) {
            toast.success("Аккаунт успешно создан!");
            setLogin('');
            setPassword('');
        }
        else if (response.status === 409) {
            toast.error("Этот логин уже занят!");
        }
        else {
            toast.error("Ошибка при регистрации!");
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
                <h2 className="auth-subtitle">Создать аккаунт</h2>

                <form className="auth-form" onSubmit={handleRegister}>
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
                    <button type="submit" className="auth-button">Создать аккаунт</button>
                </form>
                <div className="auth-footer">
                    <Link to="/" className="auth-back-link">
                        <FiHome size={18} className="home-icon" />
                        <span>На главную</span>
                    </Link>
                </div>
            </div>
        </div>
    );
}