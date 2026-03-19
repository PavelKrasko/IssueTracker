import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import WelcomePage from './pages/WelcomePage';
import HomePage from './HomePage';
import Login from './pages/Login';
import SignUp from './pages/Registration';
import './main.css';
import Profile from './pages/Profile';
import Project from './pages/Project';
import AdminPanelProject from './pages/AdminPanelProject';
import ProjectCard from './pages/ProjectCard';
import AddTask from './pages/AddTask';

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<WelcomePage />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<SignUp />} />
                <Route path="profile" element={<Profile />} />
                <Route path="/home" element={<HomePage />}>
                    <Route path="new-project" element={<Project />} />
                    <Route path="projects/:id/settings" element={<AdminPanelProject />} />
                    <Route path="projects/:id" element={<ProjectCard />} />
                    <Route path="new-task" element={<AddTask />} />
                   
                </Route>
            </Routes>
        </BrowserRouter>
    </StrictMode>
);