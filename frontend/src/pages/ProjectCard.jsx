import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import toast, { Toaster } from 'react-hot-toast';

export default function ProjectCard() {
    const { id } = useParams();
    const [project, setProject] = useState(null);
    const [tasks, setTasks] = useState([]);

    useEffect(() => {
        const fetchProjectData = async () => {
            const response = await fetch(`https://localhost:7023/api/projects/${id}`);
            if (response.ok) {
                const data = await response.json();
                setProject(data);
                setTasks([
                    { id: 1, title: "Test001", status: "Open", date: "9 November", user: "Pavel", color: "#00ff40" },
                    { id: 2, title: "Test002", status: "In process", date: "10 November", user: "Pavel", color: "#f1f50e" },
                    { id: 3, title: "Test003", status: "Wait", date: "11 November", user: "", color: "#d1d1d1" },
                    { id: 4, title: "Test003", status: "Wait", date: "11 November", user: "", color: "#d1d1d1" },
                    { id: 5, title: "Test003", status: "Wait", date: "11 November", user: "", color: "#d1d1d1" },
                    { id: 6, title: "Test003", status: "Wait", date: "11 November", user: "", color: "#d1d1d1" },
                    { id: 7, title: "Test003", status: "Wait", date: "11 November", user: "", color: "#d1d1d1" }
            
                ]);
            }
        };
        fetchProjectData();
    }, [id]);
    if (!project) return <div className="loading">Загрузка...</div>;
    const taskElements = [];
    for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        taskElements.push(
            <div key={task.id} className="custom-task-card">
                <div className="card-header">
                    <span className="card-title">{task.title}</span>
                    <div className="card-actions">
                        <FiEdit2 className="action-icon edit" />
                        <FiTrash2 className="action-icon delete" />
                    </div>
                </div>

                <div className="card-body">
                    <div className="info-field status" style={{ color: task.color }}>
                        {task.status}
                    </div>
                    <div className="info-field">
                        {task.date}
                    </div>
                    <div className="info-field user-field">
                        {task.user}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="project-page-container">
            <Toaster />
            <header className="project-page-header">
                <div className="header-content">
                    <h1>{project.name}</h1>
                    <p className="admin-label">
                        Администратор: {project.members?.find(m => m.id === project.adminId)?.login}
                    </p>
                </div>
            </header>

            <div className="tasks-grid">
                {taskElements}
            </div>
        </div>
    );
}