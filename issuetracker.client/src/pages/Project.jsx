import React, { useState } from 'react';
import { FiX } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { Toaster, toast } from 'react-hot-toast';
export default function Project() {
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    let buttonText;
    if (loading) {
        buttonText = "Создание...";
    } else {
        buttonText = "Создать";
    }
    const handleCreateProject = async (e) => {
        e.preventDefault();
        const emailArray = email.split(',').map(s => s.trim()).filter(s => s !== "");
        let hasDuplicates = false;
        for (let i = 0; i < emailArray.length; i++) {
            for (let j = i + 1; j < emailArray.length; j++) {
                if (emailArray[i] === emailArray[j]) {
                    hasDuplicates = true;
                    break;
                }
            }
            if (hasDuplicates) break;
        }

        if (hasDuplicates) {
            toast.error("Повторяющиеся email‑адреса запрещены");
            return;
        }

        setLoading(true);
        const userId = localStorage.getItem("userId");
        const response = await fetch('https://localhost:7023/api/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: name,
                emails: emailArray,
                adminId: parseInt(userId)
            })
        });
        setLoading(false);
        if (response.ok) {
            toast.success("Проект создан!");
            window.dispatchEvent(new Event("projectsUpdated"));
            setTimeout(() => {
                navigate("/home");
            }, 1000);
        } else {
            toast.error("Ошибка! Пользователь с таким email не найден");
        }
    };

    return (
        <div className="project-container">
            <Toaster position="top-center" reverseOrder={false} />
            <div className="project-card">
                <button className="close-btn" onClick={() => navigate("/home")}>
                    <FiX size={28} />
                </button>
                <h2 className="project-title">Новый проект</h2>
                <form className="project-form" onSubmit={handleCreateProject}>
                    <input
                        className="field-input"
                        type="text"
                        placeholder="Наименование проекта"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                    />
                    <input
                        className="field-input"
                        type="text"
                        placeholder="Email участника"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <button
                        className="field-input save-btn"
                        type="submit"
                        disabled={loading}
                    >
                        {buttonText}
                    </button>
                </form>
            </div>
        </div>
    );
}