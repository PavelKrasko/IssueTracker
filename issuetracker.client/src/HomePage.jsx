import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './layout/Header';
import Main from './layout/Main';
import Sidebar from './layout/Sidebar';

export default function HomePage() {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/my-tasks")
            .then(res => res.json())
            .then(data => {
                setTasks(data);
                setLoading(false);
            });
    }, []);
    if (loading) {
        return <div>��������...</div>;
    } else {
        return (
            <>
                <Header />
                <div className="layout">
                    <Sidebar />
                    <Main>
                        <Outlet context={{ tasks }} />
                    </Main>
                </div>
            </>
        );
    }
}