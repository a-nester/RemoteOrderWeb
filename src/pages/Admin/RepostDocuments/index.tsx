import React, { useState, useEffect, useRef } from 'react';

import { RepostService } from '../../../services/repost.service';

export const RepostDocuments: React.FC = () => {
    const [isReposting, setIsReposting] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const terminalEndRef = useRef<HTMLDivElement>(null);
    const eventSourceRef = useRef<EventSource | null>(null);

    // Auto-scroll to bottom of logs
    useEffect(() => {
        if (terminalEndRef.current) {
            terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs]);

    // Cleanup SSE
    useEffect(() => {
        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
        };
    }, []);

    const startReposting = async () => {
        if (!window.confirm('Ви впевнені, що хочете запустити перепроведення документів? Цей процес може зайняти певний час і заблокує всі операції запису на сервері до його завершення.')) {
            return;
        }

        setLogs([]);
        setIsReposting(true);

        try {
            // First, establish SSE connection to not miss the very first logs
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }

            eventSourceRef.current = RepostService.getLogsEventSource();

            if (eventSourceRef.current) {
                eventSourceRef.current.onmessage = (event) => {
                    const data = JSON.parse(event.data);
                    setLogs((prev) => [...prev, data.message]);

                    if (data.message.includes('process completed successfully') || data.message.includes('ERROR:')) {
                        setIsReposting(false);
                    }
                };

                eventSourceRef.current.onerror = (err) => {
                    console.error("SSE Error:", err);
                    setIsReposting(false);
                    eventSourceRef.current?.close();
                    setLogs((prev) => [...prev, '[SYSTEM] Connection to log stream lost.']);
                };
            }

            // Then send the trigger request
            await RepostService.startReposting();

        } catch (error: any) {
            console.error('Failed to start reposting:', error);
            setLogs(['[SYSTEM] Не вдалося запустити процес перепроведення документів: ' + (error.response?.data?.error || error.response?.data?.reason || error.message)]);
            setIsReposting(false);
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
        }
    };

    return (
        <div className="space-y-6 animate-fade-in p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center glass-panel p-6 rounded-2xl">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Перепроведення документів (Service)</h2>
                    <p className="text-sm text-slate-400 mt-2 max-w-xl">
                        Цей інструмент послідовно розпроводить і проводить всі проведені документи (Прибуткові накладні, Реалізації, Повернення, Встановлення цін) в хронологічному порядку.
                        Це повністю відновлює партійний облік по FIFO та перераховує прибуток по кожній позиції. Запуск заблокує систему для інших користувачів на час виконання.
                    </p>
                </div>
                <div>
                    <button 
                        onClick={startReposting} 
                        disabled={isReposting}
                        className={`shadow-lg shadow-indigo-500/20 px-6 py-3 font-medium rounded-lg text-white ${isReposting ? 'opacity-50 cursor-not-allowed bg-slate-600' : 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700'}`}
                    >
                        {isReposting ? 'Виконується...' : 'Запустити процес'}
                    </button>
                </div>
            </div>

            <div className="glass-panel p-6 rounded-2xl flex flex-col min-h-[500px] border border-slate-700/50 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-10 bg-slate-800/80 border-b border-slate-700/50 flex items-center px-4 shrink-0 rounded-t-2xl z-10 backdrop-blur-md">
                    <div className="flex space-x-2">
                        <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                        <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                    </div>
                    <span className="text-xs text-slate-400 ml-4 font-mono">system-repost-logs ~ /bin/sh</span>
                </div>
                
                <div className="flex-1 overflow-y-auto mt-12 bg-black/60 rounded-xl p-4 font-mono text-sm leading-relaxed shadow-inner">
                    {logs.length === 0 && !isReposting && (
                        <div className="text-slate-500 italic flex items-center h-full justify-center opacity-50">
                            Тут з'являться логи після запуску процесу...
                        </div>
                    )}
                    {logs.map((log, index) => {
                        let colorClass = 'text-green-400';
                        if (log.includes('Unposted')) colorClass = 'text-yellow-400';
                        if (log.includes('ERROR:')) colorClass = 'text-red-500 font-bold';
                        if (log.includes('Phase')) colorClass = 'text-blue-400 font-bold';
                        if (log.includes('completed successfully')) colorClass = 'text-emerald-400 font-bold';

                        return (
                            <div key={index} className="flex hover:bg-white/5 px-2 -mx-2 rounded transition-colors duration-150">
                                <span className="text-slate-600 mr-4 shrink-0 select-none">{(index + 1).toString().padStart(4, '0')}</span>
                                <span className={`${colorClass} whitespace-pre-wrap word-break flex-1`}>{log}</span>
                            </div>
                        )
                    })}
                    {isReposting && (
                        <div className="flex px-2 -mx-2 items-center text-slate-400 mt-2">
                            <span className="text-slate-600 mr-4 shrink-0 select-none">----</span>
                            <span className="inline-block w-2 h-4 bg-slate-400 animate-pulse"></span>
                        </div>
                    )}
                    <div ref={terminalEndRef} className="h-4" />
                </div>
            </div>
        </div>
    );
};
