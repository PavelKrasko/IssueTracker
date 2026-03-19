import React, { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import { User, LogOut, Mail, ShieldCheck } from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';
import { GoArrowLeft } from "react-icons/go";
export default function Profile() {
    const navigate = useNavigate();
    const [userData, setUserData] = useState({ login: 'Загрузка...', status: 'Пользователь' });
    useEffect(() => {
        const fetchUserData = async () => {
            const userId = localStorage.getItem('userId');
            if (!userId) {
                toast.error("Вы не авторизованы");
                navigate('/login');
                return;
            }
            const response = await fetch(`https://localhost:7023/api/auth/profile/${userId}`);
            if (response.ok) {
                const data = await response.json();
                setUserData(data);
            } else if (response.status === 404) {
                toast.error("Пользователь не найден");
            } else {
                toast.error("Ошибка сервера");
            }
        };
        fetchUserData();
    }, [navigate]);

    const handleLogout = () => {
        localStorage.clear();
        toast.success("Выход выполнен");
        navigate('/login');
    };

    return (
        <div className="auth-container">
            <Toaster position="top-center" reverseOrder={false} />
            <div className="auth-card">

                <button onClick={() => navigate(-1)} className="back-btn-card">
                    <GoArrowLeft size={24} />
                </button>

                <div className="profile-header-custom">
                    <div className="avatar-container-new">
                        <div className="profile-avatar-circle">
                            <User size={32} />
                        </div>
                        <div className="status-indicator-online"></div>
                    </div>
                    <h1 className="auth-app-name">Профиль</h1>
                    <p className="auth-subtitle">Управление аккаунтом</p>
                </div>

                <div className="auth-form">
                    <div className="profile-info-item">
                        <div className="info-icon-box">
                            <Mail size={18} />
                        </div>
                        <div className="info-text-box">
                            <span className="info-label">Логин / Email</span>
                            <span className="info-value">{userData.login}</span>
                        </div>
                    </div>

                    <div className="profile-info-item">
                        <div className="info-icon-box">
                            <ShieldCheck size={18} />
                        </div>
                        <div className="info-text-box">
                            <span className="info-label">Статус</span>
                            <span className="info-value">{userData.status || "Пользователь"}</span>
                        </div>
                    </div>

                    <button
                        onClick={handleLogout}
                        className="auth-button logout-btn-special"
                    >
                        <LogOut size={18} />
                        <span>Выйти из аккаунта</span>
                    </button>
                </div>
            </div>
        </div>
    );
}