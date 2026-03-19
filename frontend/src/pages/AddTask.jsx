import React, { useState, useEffect } from 'react';
import { FiX, FiUploadCloud, FiCalendar } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { Toaster, toast } from 'react-hot-toast';
import Swal from 'sweetalert2'; 

export default function AddTaskModal() {
    const navigate = useNavigate();
    const [projects, setProjects] = useState([]);
    const [defectTypes, setDefectTypes] = useState([]);
    const [roles, setRoles] = useState([]);

    const [isCustomDefect, setIsCustomDefect] = useState(false);
    const [isCustomRole, setIsCustomRole] = useState(false);
    const [fileName, setFileName] = useState("Прикрепить файлы");
    const [selectedFiles, setSelectedFiles] = useState([]);
    const today = new Date().toISOString().split('T')[0];

    useEffect(() => {
        async function fetchData() {
            const resProj = await fetch('https://localhost:7023/api/tasks/projects');
            setProjects(await resProj.json());

            const resDefects = await fetch('https://localhost:7023/api/tasks/defect-types');
            setDefectTypes(await resDefects.json());

            const resRoles = await fetch('https://localhost:7023/api/tasks/roles');
            setRoles(await resRoles.json());
        }
        fetchData();
    }, []);

    const projectsElements = [];
    for (let i = 0; i < projects.length; i++) {
        projectsElements.push(
            <option key={projects[i].id} value={projects[i].id}>{projects[i].name}</option>
        );
    }

    const defectElements = [];
    for (let i = 0; i < defectTypes.length; i++) {
        defectElements.push(
            <option key={i} value={defectTypes[i].name}>{defectTypes[i].name}</option>
        );
    }

    const roleElements = [];
    for (let i = 0; i < roles.length; i++) {
        roleElements.push(
            <option key={i} value={roles[i].name}>{roles[i].name}</option>
        );
    }

    const handleFileChange = (e) => {
        const files = e.target.files;
        if (files.length > 0) {
            setSelectedFiles(files);
            const names = [];
            for (let i = 0; i < files.length; i++) { names.push(files[i].name); }
            setFileName(names.join(", "));
        } else {
            setFileName("Прикрепить файлы");
            setSelectedFiles([]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        for (let i = 0; i < selectedFiles.length; i++) {
            formData.append('files', selectedFiles[i]);
        }
        const response = await fetch('https://localhost:7023/api/tasks/create', {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            await Swal.fire({
                title: 'Задача создана!',
                text: 'Новая задача успешно добавлена в систему',
                icon: 'success',
                iconColor: '#4ade80',
                confirmButtonColor: '#4ade80',
                confirmButtonText: 'Отлично',
                borderRadius: '12px'
            });
            navigate("/home");
        } else {
            toast.error("Ошибка при создании задачи");
        }
    };
    let defectField;
    if (isCustomDefect) {
        defectField = (
            <input name="defectType" className="admin-field-input" type="text" placeholder="Введите тип дефекта" autoFocus onBlur={(e) => { if (!e.target.value) setIsCustomDefect(false); }} required />
        );
    } else {
        defectField = (
            <select name="defectType" className="admin-field-input" required defaultValue="" onChange={(e) => { if (e.target.value === "custom") setIsCustomDefect(true); }}>
                <option value="" disabled>Тип дефекта</option>
                {defectElements}
                <option value="custom">Свой вариант</option>
            </select>
        );
    }

    let roleField;
    if (isCustomRole) {
        roleField = (
            <input name="executorRole" className="admin-field-input" type="text" placeholder="Введите исполнителя" autoFocus onBlur={(e) => { if (!e.target.value) setIsCustomRole(false); }} required />
        );
    } else {
        roleField = (
            <select name="executorRole" className="admin-field-input" required defaultValue="" onChange={(e) => { if (e.target.value === "custom") setIsCustomRole(true); }}>
                <option value="" disabled>Исполнитель</option>
                {roleElements}
                <option value="custom">Свой вариант</option>
            </select>
        );
    }

    return (
        <div className="admin-project-container">
            <Toaster position="top-center" reverseOrder={false} />
            <div className="admin-project-card task-modal-adjust">
                <button className="admin-close-btn" type="button" onClick={() => navigate(-1)}>
                    <FiX size={24} />
                </button>
                <h2 className="admin-project-title">Новая задача</h2>
                <form className="admin-project-form" onSubmit={handleSubmit}>
                    <select name="projectId" className="admin-field-input" required defaultValue="">
                        <option value="" disabled>Выберите проект</option>
                        {projectsElements}
                    </select>

                    <input name="description" className="admin-field-input" type="text" placeholder="Описание задачи" required />

                    <div className="admin-input-wrapper">
                        <select name="priority" className="admin-field-input" required defaultValue="">
                            <option value="" disabled>Приоритет</option>
                            <option value="Низкий">Низкий</option>
                            <option value="Средний">Средний</option>
                            <option value="Высокий">Высокий</option>
                        </select>
                        <select name="status" className="admin-field-input" required defaultValue="">
                            <option value="" disabled>Статус</option>
                            <option value="Новая">Новая</option>
                            <option value="В работе">В работе</option>
                            <option value="Решена">Решена</option>
                        </select>
                    </div>

                    <div className="admin-input-group">
                        <div className="calendar-input-wrapper">
                            <input name="dueDate" className="admin-field-input calendar-field" type="date" required min={today} defaultValue={today} />
                            <FiCalendar className="calendar-icon-hint" />
                        </div>
                    </div>

                    <div className="admin-input-wrapper">
                        <input name="module" className="admin-field-input" type="text" placeholder="Модуль" required />
                        <input name="component" className="admin-field-input" type="text" placeholder="Компонент" required />
                    </div>

                    <input name="testCase" className="admin-field-input" type="text" placeholder="Тест-кейс" required />

                    <div className="admin-input-wrapper">
                        {defectField}
                        {roleField}
                    </div>

                    <input name="comment" className="admin-field-input" type="text" placeholder="Комментарий" />

                    <div className="admin-file-upload-compact">
                        <label className="admin-file-label-compact">
                            <FiUploadCloud size={20} />
                            <span>{fileName}</span>
                            <input type="file" hidden multiple accept=".jpg, .jpeg, .png" onChange={handleFileChange} />
                        </label>
                    </div>

                    <button className="admin-save-btn action-btn-main" type="submit">Создать</button>
                </form>
            </div>
        </div>
    );
}