import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

export default function Statistics() {
    const { tasks } = useOutletContext();

    const staticTeams = [
        { name: "QA", solved: 45 },
        { name: "DevOps", solved: 32 },
        { name: "Dev", solved: 18 }
    ];
    let content;
    if (tasks) {
        if (tasks.length > 0) {
            let open = 0, work = 0, closed = 0;
            for (let i = 0; i < tasks.length; i++) {
                const t = tasks[i];
                if (t.status === "Открыта" || t.status === "Открыто") {
                    open++;
                } else if (t.status === "В работе") {
                    work++;
                } else if (t.status === "Решено" || t.status === "Закрыта" || t.status === "Закрыто") {
                    closed++;
                }
            }
            const weekDays = [0, 0, 0, 0, 0, 0, 0];
            for (let i = 0; i < tasks.length; i++) {
                const date = new Date(tasks[i].registrationDate);
                const day = date.getDay();
                let index;
                if (day === 0) {
                    index = 6;
                } else {
                    index = day - 1;
                }

                if (index >= 0 && index < 7) {
                    weekDays[index]++;
                }
            }

            const teamElements = [];
            for (let i = 0; i < staticTeams.length; i++) {
                const team = staticTeams[i];
                const widthPercent = (team.solved / 60) * 100;

                teamElements.push(
                    <div key={i} className="team-item">
                        <span className="team-rank">#{i + 1}</span>
                        <span className="team-name">{team.name}</span>
                        <div className="progress-bar">
                            <div className="progress-fill" style={{ width: widthPercent + "%" }}></div>
                        </div>
                        <span className="team-score">{team.solved} задач</span>
                    </div>
                );
            }
            const barData = [];
            barData.push({ name: 'Пн', Баги: weekDays[0] });
            barData.push({ name: 'Вт', Баги: weekDays[1] });
            barData.push({ name: 'Ср', Баги: weekDays[2] });
            barData.push({ name: 'Чт', Баги: weekDays[3] });
            barData.push({ name: 'Пт', Баги: weekDays[4] });

            content = (
                <div className="stats-grid">
                    <div className="statistics-container">
                        <h2 className="stat-header">Распределение статусов</h2>
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie data={[{ name: 'Открыто', value: open }, { name: 'В работе', value: work }, { name: 'Закрыто', value: closed }]}
                                    innerRadius={60} outerRadius={80} dataKey="value">
                                    <Cell fill="#00ff40" />
                                    <Cell fill="#f1f50e" />
                                    <Cell fill="#ef4444" />
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="statistics-container">
                        <h2 className="stat-header">Активность за неделю</h2>
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={barData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="Баги" fill="#2980b9" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="statistics-container full-width">
                        <h2 className="stat-header">Лучшие команды</h2>
                        <div className="teams-list">{teamElements}</div>
                    </div>
                </div>
            );
        } else {
            content = <div className="statistics-container">Нет данных</div>;
        }
    } else {
        content = <div className="statistics-container">Загрузка...</div>;
    }

    return content;
}