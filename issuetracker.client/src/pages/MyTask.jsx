import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiInbox, FiX, FiChevronDown, FiUploadCloud } from "react-icons/fi";
import { Toaster, toast } from 'react-hot-toast';

export default function MyTask() {
    const navigate = useNavigate();
    const { search } = useLocation();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [sortOrder, setSortOrder] = useState("desc");

    const [selectedTask, setSelectedTask] = useState(null);
    const [taskFiles, setTaskFiles] = useState([]);
    const [fullscreenImage, setFullscreenImage] = useState(null);

    const menuRef = useRef(null);

    const openTaskDetails = async (task) => {
        const response = await fetch(`/api/tasks/${task.id}`);

        if (response.ok) {
            const data = await response.json();
            setSelectedTask(data);

            if (data.investments) {
                setTaskFiles(data.investments);
            } else {
                setTaskFiles([]);
            }
        } else {
            toast.error("Не удалось загрузить детали задачи");
        }
    };

    const formatToRussianDate = (isoDateStr) => {
        if (!isoDateStr) {
            return "Нет даты";
        }
        const date = new Date(isoDateStr);
        const day = date.getDate();
        const months = [
            "января", "февраля", "марта", "апреля", "мая", "июня",
            "июля", "августа", "сентября", "октября", "ноября", "декабря"
        ];
        return day + " " + months[date.getMonth()];
    };

    const params = new URLSearchParams(search);
    let searchQuery = params.get("search");
    if (!searchQuery) {
        searchQuery = "";
    }

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
        const fetchMyTasks = async () => {
            const response = await fetch("/api/my-tasks");

            if (response.ok) {
                const allTasks = await response.json();
                const userId = localStorage.getItem("userId");
                const storageKey = "myTasks_" + userId;
                const rawData = localStorage.getItem(storageKey);

                if (!rawData || rawData === "[]") {
                    setTasks([]);
                } else {
                    const mySavedIds = JSON.parse(rawData);
                    const myTasks = allTasks.filter(task => {
                        return mySavedIds.some(savedId => String(savedId) === String(task.id));
                    });
                    setTasks(myTasks);
                }
            }
            setLoading(false);
        };
        fetchMyTasks();
    }, []);

    if (loading) {
        return <div className="loading">Загрузка...</div>;
    }

    const filteredTasks = tasks.filter(task => {
        const titleMatch = task.title && task.title.toLowerCase().includes(searchQuery.toLowerCase());
        const descMatch = task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase());
        return titleMatch || descMatch;
    });

    const sortedTasks = [...filteredTasks].sort((a, b) => {
        const dateA = new Date(a.registrationDate).getTime();
        const dateB = new Date(b.registrationDate).getTime();

        if (sortOrder === "asc") {
            return dateA - dateB;
        } else {
            return dateB - dateA;
        }
    });

    const taskElements = sortedTasks.map(task => {
        let statusColor = "#d1d1d1";
        if (task.status === "Открыта" || task.status === "Открыто") {
            statusColor = "#00ff40";
        } else if (task.status === "В работе") {
            statusColor = "#f1f50e";
        } else if (task.status === "Решено" || task.status === "Закрыта" || task.status === "Закрыто") {
            statusColor = "#ef4444";
        }

        return (
            <div key={task.id} className="custom-task-card" onClick={() => openTaskDetails(task)}>
                <div className="card-header">
                    <span className="card-title">{task.description || task.title}</span>
                </div>
                <div className="card-body">
                    <div className="info-field status" style={{ color: statusColor }}>
                        {task.status}
                    </div>
                    <div className="info-field">
                        {formatToRussianDate(task.registrationDate)}
                    </div>
                    <div className="info-field user-field">
                        {task.roleName}
                    </div>
                </div>
            </div>
        );
    });

    let content;
    if (taskElements.length === 0) {
        let message = "Список ваших задач пуст";
        if (searchQuery) {
            message = "По вашему запросу ничего не найдено";
        }
        content = (
            <div className="no-tasks-container">
                <div className="no-tasks-content">
                    <FiInbox className="no-tasks-icon" />
                    <p className="no-tasks-message">{message}</p>
                </div>
            </div>
        );
    } else {
        content = taskElements;
    }

    return (
        <div className="project-page-container">
            <Toaster />
            <header className="project-page-header">
                <div className="header-content">
                    <div className="title-section">
                        <h1>Мои задачи</h1>
                    </div>
                    <div className="sort-wrapper" ref={menuRef}>
                        <button className="sort-trigger" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                            Сортировка <FiChevronDown className={isMenuOpen ? "sort-icon open" : "sort-icon"} />
                        </button>
                        {isMenuOpen && (
                            <div className="sort-menu">
                                <div className="menu-header">Дата</div>
                                <hr />
                                <div className={sortOrder === "asc" ? "menu-item active" : "menu-item"} onClick={() => { setSortOrder("asc"); setIsMenuOpen(false); }}>По возрастанию</div>
                                <div className={sortOrder === "desc" ? "menu-item active" : "menu-item"} onClick={() => { setSortOrder("desc"); setIsMenuOpen(false); }}>По убыванию</div>
                            </div>
                        )}
                    </div>
                    <button className="close-project-btn" onClick={() => navigate('/home')}>
                        <FiX size={24} />
                    </button>
                </div>
            </header>

            <div className="tasks-grid" key={sortOrder}>
                {content}
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

                            {taskFiles.length > 0 && (
                                <div className="modal-files">
                                    <div className="files-header"><FiUploadCloud size={20} /> <span>Прикрепленные файлы:</span></div>
                                    <div className="files-list">
                                        {taskFiles.map((f, i) => (
                                            <img key={i} src={"https://localhost:7023" + f.path} alt="attachment" onClick={() => setFullscreenImage("https://localhost:7023" + f.path)} />
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