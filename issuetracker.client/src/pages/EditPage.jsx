import React, { useState, useEffect } from 'react';
import { FiX, FiUploadCloud, FiCalendar } from "react-icons/fi";
import { useNavigate, useParams } from "react-router-dom";
import { Toaster, toast } from 'react-hot-toast';
import Swal from 'sweetalert2';

export default function EditTaskPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [projects, setProjects] = useState([]);
    const [defectTypes, setDefectTypes] = useState([]);
    const [roles, setRoles] = useState([]);
    const [taskData, setTaskData] = useState(null);

    const [isCustomDefect, setIsCustomDefect] = useState(false);
    const [isCustomRole, setIsCustomRole] = useState(false);
    const [fileName, setFileName] = useState("Прикрепить новые файлы");
    const [selectedFiles, setSelectedFiles] = useState([]);
    const today = new Date().toISOString().split('T')[0];

    useEffect(() => {
        async function fetchData() {
            const resProj = await fetch('/api/tasks-edit/projects');
            const resDefects = await fetch('/api/tasks-edit/defect-types');
            const resRoles = await fetch('/api/tasks-edit/roles');
            const resTask = await fetch("/api/tasks-edit/" + id);

            if (resProj.ok && resDefects.ok && resRoles.ok && resTask.ok) {
                const projJson = await resProj.json();
                const defectJson = await resDefects.json();
                const roleJson = await resRoles.json();
                const taskJson = await resTask.json();

                setProjects(projJson);
                setDefectTypes(defectJson);
                setRoles(roleJson);
                setTaskData(taskJson);

                let foundDefect = false;
                for (let i = 0; i < defectJson.length; i++) {
                    if (defectJson[i].name === taskJson.defectTypeName) {
                        foundDefect = true;
                        break;
                    }
                }
                if (!foundDefect && taskJson.defectTypeName) setIsCustomDefect(true);

                let foundRole = false;
                for (let i = 0; i < roleJson.length; i++) {
                    if (roleJson[i].name === taskJson.roleName) {
                        foundRole = true;
                        break;
                    }
                }
                if (!foundRole && taskJson.roleName) setIsCustomRole(true);

            } else {
                toast.error("Ошибка при загрузке данных");
            }
        }
        fetchData();
    }, [id]);

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
            for (let i = 0; i < files.length; i++) {
                names.push(files[i].name);
            }
            setFileName(names.join(", "));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const selectedStatus = formData.get("Status");
        formData.append('UserLogin', localStorage.getItem("userLogin"));
        for (let i = 0; i < selectedFiles.length; i++) {
            formData.append('files', selectedFiles[i]);
        }

        const response = await fetch("/api/tasks-edit/update/" + id, {
            method: 'PUT',
            body: formData
        });
        if (response.ok) {
            const userId = localStorage.getItem("userId");
            const storageKey = `myTasks_${userId}`;
            let myTasks = JSON.parse(localStorage.getItem(storageKey) || "[]");

            if (selectedStatus === "В работе") {
                if (!myTasks.includes(id)) {
                    myTasks.push(id);
                }
            } else {
                myTasks = myTasks.filter(taskId => String(taskId) !== String(id));
            }

            localStorage.setItem(storageKey, JSON.stringify(myTasks));

            await Swal.fire({
                title: 'Сохранено!',
                text: 'Задача успешно обновлена',
                icon: 'success',
                confirmButtonColor: '#4ade80',
                confirmButtonText: 'Отлично'
            });
            navigate("/home");
        } else {
            const errorData = await response.json();
            toast.error(errorData.message || "Ошибка при сохранении изменений");
        }
    };

    if (!taskData) return <div className="admin-project-container">Загрузка...</div>;

    let defectField = (
        <select name="DefectType" className="admin-field-input" required
            defaultValue={taskData.defectTypeName}
            onChange={(e) => { if (e.target.value === "custom") setIsCustomDefect(true); }}>
            {defectElements}
            <option value="custom">Свой вариант</option>
        </select>
    );
    if (isCustomDefect) {
        defectField = (
            <input name="DefectType" className="admin-field-input" type="text"
                defaultValue={taskData.defectTypeName} autoFocus
                onBlur={(e) => { if (!e.target.value) setIsCustomDefect(false); }} required />
        );
    }

    let roleField = (
        <select name="ExecutorRole" className="admin-field-input" required
            defaultValue={taskData.roleName}
            onChange={(e) => { if (e.target.value === "custom") setIsCustomRole(true); }}>
            {roleElements}
            <option value="custom">Свой вариант</option>
        </select>
    );
    if (isCustomRole) {
        roleField = (
            <input name="ExecutorRole" className="admin-field-input" type="text"
                defaultValue={taskData.roleName} autoFocus
                onBlur={(e) => { if (!e.target.value) setIsCustomRole(false); }} required />
        );
    }

    return (
        <div className="admin-project-container">
            <Toaster position="top-center" />
            <div className="admin-project-card task-modal-adjust">
                <button className="admin-close-btn" type="button" onClick={() => navigate(-1)}>
                    <FiX size={24} />
                </button>
                <h2 className="admin-project-title">Редактировать задачу</h2>
                <form className="admin-project-form" onSubmit={handleSubmit}>
                    <select name="ProjectId" className="admin-field-input" required defaultValue={taskData.projectId}>
                        {projectsElements}
                    </select>
                    <input name="Description" className="admin-field-input" type="text"
                        placeholder="Описание" defaultValue={taskData.description} required />

                    <div className="admin-input-wrapper">

                        <select name="Priority" className="admin-field-input" required defaultValue={taskData.priority}>
                            <option value="Низкий">Низкий</option>
                            <option value="Средний">Средний</option>
                            <option value="Высокий">Высокий</option>
                        </select>
                        <select name="Status" className="admin-field-input" required defaultValue={taskData.status}>
                            <option value="Открыто">Открыто</option>
                            <option value="В работе">В работе</option>
                            <option value="Решено">Решено</option>
                        </select>
                    </div>

                    <div className="admin-input-group">
                        <div className="calendar-input-wrapper">
                            <input name="LastModifiedDate" className="admin-field-input calendar-field"
                                type="date" required min={today}
                                defaultValue={today} />
                            <FiCalendar className="calendar-icon-hint" />
                        </div>
                    </div>

                    <div className="admin-input-wrapper">
                        <input name="Module" className="admin-field-input" type="text"
                            placeholder="Модуль" defaultValue={taskData.moduleName} required />
                        <input name="Component" className="admin-field-input" type="text"
                            placeholder="Компонент" defaultValue={taskData.componentName} required />
                    </div>
                    <input name="TestCase" className="admin-field-input" type="text"
                        placeholder="Тест-кейс" defaultValue={taskData.testCase} required />

                    <div className="admin-input-wrapper">
                        {defectField}
                        {roleField}
                    </div>
                    <input name="Comment" className="admin-field-input" type="text"
                        placeholder="Комментарий" defaultValue={taskData.comment} />

                    <div className="admin-file-upload-compact">
                        <label className="admin-file-label-compact">
                            <FiUploadCloud size={20} />
                            <span>{fileName}</span>
                            <input type="file" hidden multiple accept=".jpg, .jpeg, .png" onChange={handleFileChange} />
                        </label>
                    </div>

                    <button className="admin-save-btn action-btn-main" type="submit">
                        Сохранить изменения
                    </button>
                </form>
            </div>
        </div>
    );
}