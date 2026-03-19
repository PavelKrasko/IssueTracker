import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './layout/Header';
import Main from './layout/Main';
import Sidebar from './layout/Sidebar';
export default function HomePage() {
    return (
        <>
            <Header />
            <div className="layout">
                <Sidebar />
                <Main>
                    <Outlet />
                </Main>
            </div>
        </>
    );
}