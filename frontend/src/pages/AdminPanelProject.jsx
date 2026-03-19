import React, { useState, useEffect } from 'react';
import { FiX, FiPlus, FiTrash2 } from "react-icons/fi";
import { useNavigate, useParams } from "react-router-dom";
import Swal from 'sweetalert2';
import toast, { Toaster } from 'react-hot-toast';

export default function AdminPanelProject() {
    const navigate = useNavigate();
    const { id } = useParams();
    const [participants, setParticipants] = useState([]);
    const [projectName, setProjectName] = useState("");
    const [newMemberLogin, setNewMemberLogin] = useState("");
    const [adminId, setAdminId] = useState(null);

    useEffect(() => {
        const loadParticipants = async () => {
            const response = await fetch(`https://localhost:7023/api/projects/${id}`);
            if (response.ok) {
                const data = await response.json();
                setParticipants(data.members || []);
                setProjectName(data.name || "");
                setAdminId(data.adminId);
            }
        };

        if (id) loadParticipants();
    }, [id]);

    const handleRename = async (e) => {
        e.preventDefault();
        const response = await fetch(`https://localhost:7023/api/projects/${id}/rename`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(projectName)
        });

        if (response.ok) {
            toast.success('Название изменено');
        } else {
            const errorText = await response.text();
            toast.error(errorText || 'Ошибка переименования');
        }
    };

    const handleAddMember = async () => {
        if (!newMemberLogin.trim()) return;
        const response = await fetch(`https://localhost:7023/api/projects/${id}/join-by-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newMemberLogin)
        });

        if (response.ok) {
            const updatedProject = await response.json();
            setParticipants(updatedProject.members || []);
            setNewMemberLogin("");
            toast.success('Участник добавлен');
        } else {
            const errorText = await response.text();
            toast.error(errorText || 'Ошибка добавления');
        }
    };

    const handleRemoveMember = async (userId, userLogin) => {
        if (userId === adminId) {
            toast.error("Вы не можете удалить администратора");
            return;
        }
        const result = await Swal.fire({
            title: 'Удалить участника?',
            text: `Вы уверены, что хотите убрать ${userLogin} из проекта?`,
            icon: 'warning',
            iconColor: '#DCDCDC',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#DCDCDC',
            confirmButtonText: 'Да, удалить',
            cancelButtonText: 'Отмена',
            borderRadius: '12px'
        });

        if (result.isConfirmed) {
            const response = await fetch(`https://localhost:7023/api/projects/${id}/kick-member/${userId}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                setParticipants(participants.filter(p => p.id !== userId));
                toast.success('Участник удален');
            } else {
                const errorText = await response.text();
                toast.error(errorText || "Ошибка удаления");
            }
        }
    };

    const handleDeleteProject = async () => {
        const result = await Swal.fire({
            title: 'Удалить проект?',
            text: "Это действие полностью удалит проект и всех его участников!",
            icon: 'warning',
            iconColor: '#DCDCDC',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#DCDCDC',
            confirmButtonText: 'Да, удалить всё',
            cancelButtonText: 'Отмена',
            borderRadius: '12px'
        });
        if (result.isConfirmed) {
            const response = await fetch(`https://localhost:7023/api/projects/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                await Swal.fire({
                    title: 'Удалено',
                    text: 'Проект был успешно удален',
                    icon: 'success',
                    confirmButtonColor: '#DCDCDC',
                    borderRadius: '12px'
                });
                window.location.href = "/home";
            } else {
                toast.error("Ошибка при удалении проекта");
            }
        }
    };

    const participantsList = participants.map((member, i) => (
        <div className="participant-item" key={member.id || i}>
            <span className="participant-name">{member.login}</span>
            {member.id !== adminId && (
                <button
                    type="button"
                    className="participant-remove"
                    onClick={() => handleRemoveMember(member.id, member.login)}
                >
                    <FiX size={16} />
                </button>
            )}
        </div>
    ));

    return (
        <div className="admin-project-container">
            <Toaster position="top-center" reverseOrder={false} />
            <div className="admin-project-card">
                <button className="admin-close-btn" onClick={() => navigate("/home")}>
                    <FiX size={28} />
                </button>
                <h2 className="admin-project-title">Управление проектом</h2>
                <form className="admin-project-form" onSubmit={handleRename}>
                    <input
                        className="admin-field-input"
                        type="text"
                        placeholder="Наименование проекта"
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                    />

                    <div className="admin-input-wrapper">
                        <input
                            className="admin-field-input"
                            type="text"
                            placeholder="Логин участника"
                            value={newMemberLogin}
                            onChange={(e) => setNewMemberLogin(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddMember();
                                }
                            }}
                        />
                        <button
                            type="button"
                            className="admin-add-btn"
                            onClick={handleAddMember}
                        >
                            <FiPlus size={20} />
                        </button>
                    </div>

                    <div className="admin-participants-list">
                        <p className="admin-section-label">Добавленные участники:</p>
                        {participantsList}
                        {participants.length === 0 && (
                            <p className="admin-section-label">Список пуст</p>
                        )}
                    </div>

                    <button className="admin-save-btn" type="submit">
                        Сохранить изменения
                    </button>

                    <button
                        type="button"
                        className="admin-delete-project-btn"
                        onClick={handleDeleteProject}
                    >
                        <FiTrash2 size={16} />
                        <span>Удалить проект</span>
                    </button>
                </form>
            </div>
        </div>
    );
}