import React, { useState, useEffect } from 'react';
import { FiPlus, FiCheckSquare, FiFolder, FiChevronDown, FiLogOut, FiSettings } from "react-icons/fi";
import { Link, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
function Sidebar() {
    const navigate = useNavigate();
    const currentUserId = parseInt(localStorage.getItem('userId'));
    const [isOpen, setIsOpen] = useState(false);
    const [projects, setProjects] = useState([]);
    const fetchProjects = async () => {
        const userId = localStorage.getItem('userId');
        if (!userId) return;
        const response = await fetch(`https://localhost:7023/api/projects/user/${userId}`);
        if (response.ok) {
            const data = await response.json();
            setProjects(data);
        }
    };

    const handleLeaveProject = async (projectId) => {
        const result = await Swal.fire({
            title: 'Выйти из проекта?',
            text: "Это действие ограничит ваш доступ к задачам.",
            icon: 'warning',
            iconColor: '#DCDCDC',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#DCDCDC',
            confirmButtonText: 'Да, выйти',
            cancelButtonText: 'Отмена',
            background: '#ffffff',
            color: '#000000',
            padding: '1rem',
            borderRadius: '12px'
        });

        if (result.isConfirmed) {
            const userId = localStorage.getItem('userId');
            const response = await fetch(`https://localhost:7023/api/projects/${projectId}/leave/${userId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                fetchProjects();
                Swal.fire({
                    title: 'Готово',
                    text: 'Вы покинули проект',
                    icon: 'success',
                    confirmButtonColor: '#DCDCDC',
                    background: '#ffffff',
                    color: '#000000',
                    borderRadius: '12px'
                });
            }
        }
    };

    useEffect(() => {
        fetchProjects();
        const handleRefresh = () => fetchProjects();
        window.addEventListener('storage', handleRefresh);
        window.addEventListener('projectsUpdated', handleRefresh);
        return () => {
            window.removeEventListener('storage', handleRefresh);
            window.removeEventListener('projectsUpdated', handleRefresh);
        };
    }, []);

    const projectsElements = [];
    for (let i = 0; i < projects.length; i++) {
        projectsElements.push(
            <div key={projects[i].id} className="project-item-container">
                <Link
                    to={`/home/projects/${projects[i].id}`}
                    className="menu-link project-item-card"
                >
                    {projects[i].name}
                </Link>
                <div className="project-actions">
                    {projects[i].adminId === currentUserId && (
                        <button
                            onClick={() => navigate(`/home/projects/${projects[i].id}/settings`)}
                            className="settings-btn"
                            title="Настройки проекта"
                        >
                            <FiSettings size={16} />
                        </button>
                    )}

                    <button
                        onClick={() => handleLeaveProject(projects[i].id)}
                        className="leave-btn"
                        title="Выйти из проекта"
                    >
                        <FiLogOut size={16} />
                    </button>
                </div>
            </div>
        );
    }

    let chevronClass = "icon-transition";
    if (isOpen) {
        chevronClass = "icon-transition rotate";
    } else {
        chevronClass = "icon-transition";
    }

    return (
        <div className="sidebar">
            <Link to="/home/new-task" className="menu-link">
                <FiPlus /> Создать задачу
            </Link>

            <Link to="/home/new-project" className="menu-link">
                <FiFolder /> Новый проект
            </Link>

            <Link to="#" className="menu-link">
                <FiCheckSquare /> Мои задачи
            </Link>

            <div className="menu-link" onClick={() => setIsOpen(!isOpen)} style={{ cursor: 'pointer' }}>
                <FiFolder />
                <span>Мои проекты</span>
                <FiChevronDown className={chevronClass} />
            </div>
            {isOpen && (
                <div className="projects-list">
                    {projectsElements}
                </div>
            )}
        </div>
    );
}

export default Sidebar;