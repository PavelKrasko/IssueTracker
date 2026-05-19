import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { FiEdit2, FiTrash2, FiInbox, FiX, FiChevronDown, FiUploadCloud} from "react-icons/fi";
import toast, { Toaster } from 'react-hot-toast';
import Swal from 'sweetalert2';

export default function ProjectCard() {
    const { id } = useParams();
    const { search } = useLocation();
    const navigate = useNavigate();

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [project, setProject] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sortOrder, setSortOrder] = useState("desc");
    const menuRef = useRef(null);
    const [selectedTask, setSelectedTask] = useState(null);
    const [taskFiles, setTaskFiles] = useState([]);

    const params = new URLSearchParams(search);
    const searchQuery = params.get("search") || "";
    const currentUserId = parseInt(localStorage.getItem("userId"));
    const [fullscreenImage, setFullscreenImage] = useState(null);


    useEffect(() => {

        const handleClickOutside = (event) => {
            if (menuRef.current) {
                if (!menuRef.current.contains(event.target)) {
                    setIsMenuOpen(false);
                }
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    useEffect(() => {
        const fetchProjectData = async () => {
            const projectResponse = await fetch(`/api/tasks/project-info/${id}`);
            if (projectResponse.ok) {
                const projectData = await projectResponse.json();
                setProject(projectData);
                const tasksResponse = await fetch(`/api/tasks/project/${id}`);
                if (tasksResponse.ok) {
                    const tasksData = await tasksResponse.json();
                    setTasks(tasksData);
                }
            } else {
                toast.error("Проект не найден");
            }
            setLoading(false);
        };
        fetchProjectData();
    }, [id]);

    const handleDeleteTask = async (taskId, taskTitle) => {
        if (currentUserId !== project.adminId) {
            toast.error("Только администратор может удалять задачи");
            return;
        }

        const result = await Swal.fire({
            title: 'Удалить задачу?',
            text: `Вы уверены, что хотите удалить "${taskTitle}"?`,
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
            const response = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
            if (response.ok) {
                setTasks(tasks.filter(t => t.id !== taskId));
                toast.success('Задача удалена');
            }
        }
    };
    const openTaskDetails = async (task) => {
        const response = await fetch(`/api/tasks/${task.id}`);
        if (response.ok) {
            const data = await response.json();
            setSelectedTask(data);
            setTaskFiles(data.investments || []);
        } else {
            toast.error("Не удалось загрузить данные задачи");
        }
    };

    if (loading) {
        return <div>Загрузка...</div>;
    }
    if (!project) {
        return <div>Данные не найдены</div>;
    }

    const parseRussianDate = (dateStr) => {
        const months = { 'января': 0, 'февраля': 1, 'марта': 2, 'апреля': 3, 'мая': 4, 'июня': 5, 'июля': 6, 'августа': 7, 'сентября': 8, 'октября': 9, 'ноября': 10, 'декабря': 11 };
        const parts = dateStr.split(' ');
        return new Date(new Date().getFullYear(), months[parts[1].toLowerCase()], parseInt(parts[0])).getTime();
    };

    const filteredTasks = tasks.filter(task => task.title.toLowerCase().includes(searchQuery.toLowerCase()));

    const sortedTasks = [...filteredTasks].sort((a, b) => {
        const timeA = parseRussianDate(a.date);
        const timeB = parseRussianDate(b.date);
        if (sortOrder === "asc") {
            return timeA - timeB;
        } else {
            return timeB - timeA;
        }
    });

    const taskElements = [];
    for (let i = 0; i < sortedTasks.length; i++) {
        const task = sortedTasks[i];
        let statusColor = "#d1d1d1";
        if (task.status === "Открыта" || task.status === "Открыто") {
            statusColor = "#00ff40";
        } else if (task.status === "В работе") {
            statusColor = "#f1f50e";
        } else if (task.status === "Решено" || task.status === "Закрыта" || task.status === "Закрыто") {
            statusColor = "#ef4444";
        }

        taskElements.push(
            <div key={task.id} className="custom-task-card" onClick={() => openTaskDetails(task)}>
                <div className="card-header">
                    <span className="card-title">{task.title}</span>
                    <div className="card-actions" onClick={e => e.stopPropagation()}>
                        <FiEdit2 className="action-icon" onClick={() => navigate(`/home/edit-task/${task.id}`)} />
                        <FiTrash2 className="action-icon" onClick={() => handleDeleteTask(task.id, task.title)} />
                    </div>
                </div>
                <div className="card-body">
                    <div className="info-field status" style={{ color: statusColor }}>{task.status}</div>
                    <div className="info-field">{task.date}</div>
                    <div className="info-field user-field">{task.user}</div>
                </div>
            </div>
        );
    }

    let ascClass = "menu-item";
    if (sortOrder === "asc") {
        ascClass = "menu-item active";
    }
    let descClass = "menu-item";
    if (sortOrder === "desc") {
        descClass = "menu-item active";
    }

    let iconClass = "sort-icon";
    if (isMenuOpen) {
        iconClass = "sort-icon open";
    }

    let gridContent;
    if (taskElements.length > 0) {
        gridContent = taskElements;
    } else {
        gridContent = (
            <div className="no-tasks-container">
                <FiInbox className="no-tasks-icon" />
                <p className="no-tasks-message">Задач нет</p>
            </div>
        );
    }

    return (
        <div className="project-page-container">
            <Toaster />
            <header className="project-page-header">
                <div className="header-content">
                    <div className="title-section">
                        <h1>{project.name}</h1>
                        <p className="admin-label">
                            Администратор: {project.members.find(m => m.id === project.adminId)?.login || "Неизвестен"}
                        </p>
                    </div>

                    <div className="sort-wrapper" ref={menuRef}>
                        <button className="sort-trigger" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                            Сортировка <FiChevronDown className={iconClass} />
                        </button>
                        {isMenuOpen && (
                            <div className="sort-menu">
                                <div className="menu-header">Дата</div>
                                <hr />
                                <div className={ascClass} onClick={() => { setSortOrder("asc"); setIsMenuOpen(false); }}>По возрастанию</div>
                                <div className={descClass} onClick={() => { setSortOrder("desc"); setIsMenuOpen(false); }}>По убыванию</div>
                            </div>
                        )}
                    </div>
                    <button className="close-project-btn" onClick={() => navigate('/home')}><FiX /></button>
                </div>
            </header>

            <div className="tasks-grid" key={sortOrder}>
                {gridContent}
            </div>
            {selectedTask && (
                <div className="modal-overlay" onClick={() => setSelectedTask(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <button className="close-btn" onClick={() => setSelectedTask(null)}><FiX /></button>
                        <h2 className="modal-title-centered">{selectedTask.description}</h2>

                        <div className="modal-body">
                            <div className="modal-field">
                                <span>Приоритет:</span> {selectedTask.priority}
                            </div>
                            <div className="modal-field">
                                <span>Статус:</span> {selectedTask.status}
                            </div>
                            <div className="modal-field">
                                <span>Модуль:</span> {selectedTask.moduleName}
                            </div>
                            <div className="modal-field">
                                <span>Компонент:</span> {selectedTask.componentName}
                            </div>
                            <div className="modal-field">
                                <span>Тип дефекта:</span> {selectedTask.defectTypeName}
                            </div>
                            <div className="modal-field">
                                <span>Тест-кейс:</span> {selectedTask.testCase}
                            </div>
                            <div className="modal-field comment-field">
                                <span>Комментарий:</span>
                                <p>{selectedTask.comment || "Нет комментариев"}</p>
                            </div>

                            {taskFiles && taskFiles.length > 0 && (
                                <div className="modal-files">
                                    <div className="files-header">
                                        <FiUploadCloud size={20} />
                                        <span>Прикрепленные файлы:</span>
                                    </div>
                                    <div className="files-list">
                                        {taskFiles.map((f, i) => (
                                            <img
                                                key={i}
                                                src={`https://localhost:7023${f.path}`}
                                                alt="attachment"
                                                onClick={() => setFullscreenImage(`https://localhost:7023${f.path}`)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            {fullscreenImage && (
                <div className="fullscreen-img-overlay" onClick={() => setFullscreenImage(null)}>
                    <img src={fullscreenImage} alt="Full view" />
                </div>
            )}
        </div>
    );
}