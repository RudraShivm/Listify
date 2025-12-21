
import React, { useState, useRef } from 'react';
import { useStore } from '../context/Store';
import { format } from 'date-fns';
import { CheckSquare, Square, Plus, Archive, ChevronLeft, Calendar as CalendarIcon, GripVertical } from 'lucide-react';
import { TodoItem } from '../types';

export const TodoView = () => {
    const { getTodosForDate, addTodo, toggleTodo, getArchivedTodos, reorderTodos } = useStore();
    const [inputValue, setInputValue] = useState('');
    const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [showArchive, setShowArchive] = useState(false);
    
    // Drag & Drop State
    const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
    
    const todos = getTodosForDate(selectedDate);
    const isToday = selectedDate === format(new Date(), 'yyyy-MM-dd');

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputValue.trim()) return;
        addTodo(selectedDate, inputValue);
        setInputValue('');
    };

    const handleDragStart = (e: React.DragEvent, index: number) => {
        setDraggedItemIndex(index);
        e.dataTransfer.effectAllowed = 'move';
        // Add transparency to drag ghost
        const target = e.target as HTMLElement;
        target.style.opacity = '0.5';
    };

    const handleDragEnd = (e: React.DragEvent) => {
        setDraggedItemIndex(null);
        const target = e.target as HTMLElement;
        target.style.opacity = '1';
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedItemIndex === null || draggedItemIndex === index) return;
        
        // Reorder
        const newTodos = [...todos];
        const draggedItem = newTodos[draggedItemIndex];
        newTodos.splice(draggedItemIndex, 1);
        newTodos.splice(index, 0, draggedItem);
        
        // Update local state is handled via reorderTodos immediately for responsiveness
        // But to avoid flicker we might want local state. 
        // For simplicity with React state updates, we assume fast updates.
        reorderTodos(selectedDate, newTodos);
        setDraggedItemIndex(index);
    };

    if (showArchive) {
        const archives = getArchivedTodos();
        return (
            <div className="max-w-xl mx-auto h-full flex flex-col">
                <div className="flex items-center gap-2 mb-6">
                    <button onClick={() => setShowArchive(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                        <ChevronLeft size={20} />
                    </button>
                    <h2 className="text-xl font-semibold">Past Todo Lists</h2>
                </div>
                
                <div className="space-y-6 overflow-y-auto pb-20">
                    {archives.length === 0 && <div className="text-center text-gray-400 mt-10">No archived lists yet.</div>}
                    {archives.map(list => (
                        <div key={list.date} className="bg-surface-light dark:bg-surface-dark p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                             <div className="font-medium mb-3 text-primary">{format(new Date(list.date), 'MMMM do, yyyy')}</div>
                             <div className="space-y-2">
                                 {list.items.map(item => (
                                     <div key={item.id} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                         {item.isCompleted ? <CheckSquare size={14}/> : <Square size={14}/>}
                                         <span className={item.isCompleted ? 'line-through' : ''}>{item.text}</span>
                                     </div>
                                 ))}
                             </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-xl mx-auto h-full flex flex-col">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h2 className="text-2xl font-semibold mb-2 text-text-primary dark:text-text-darkPrimary">
                        Tasks
                    </h2>
                    <div className="flex items-center gap-2 text-text-secondary dark:text-text-darkSecondary bg-gray-100 dark:bg-gray-800 p-1.5 rounded-lg w-fit">
                        <CalendarIcon size={16} />
                        <input 
                            type="date" 
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="bg-transparent border-none text-sm focus:outline-none text-text-primary dark:text-text-darkPrimary"
                        />
                    </div>
                </div>
                <button 
                    onClick={() => setShowArchive(true)}
                    className="p-2 text-gray-400 hover:text-primary transition-colors flex flex-col items-center gap-1 text-xs"
                >
                    <Archive size={20} />
                    <span>Archive</span>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 mb-6">
                {todos.map((todo, index) => (
                    <div 
                        key={todo.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e) => handleDragOver(e, index)}
                        className={`group flex items-center gap-3 p-3 rounded-xl border transition-all cursor-default
                            ${todo.isCompleted 
                                ? 'bg-gray-50 dark:bg-white/5 border-transparent opacity-60' 
                                : 'bg-surface-light dark:bg-surface-dark border-gray-100 dark:border-gray-800 shadow-sm'
                            }
                            ${draggedItemIndex === index ? 'border-primary border-dashed bg-primary/5' : ''}
                        `}
                    >
                        <div className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 p-1">
                            <GripVertical size={16} />
                        </div>

                        <button 
                            onClick={() => toggleTodo(selectedDate, todo.id)}
                            className={`p-1 rounded transition-colors ${todo.isCompleted ? 'text-primary' : 'text-gray-300 hover:text-primary'}`}
                        >
                            {todo.isCompleted ? <CheckSquare size={20} /> : <Square size={20} />}
                        </button>
                        <span className={`flex-1 ${todo.isCompleted ? 'line-through' : ''}`}>
                            {todo.text}
                        </span>
                    </div>
                ))}
                {todos.length === 0 && (
                    <div className="text-center py-12 text-gray-400">
                        <CheckSquare size={48} className="mx-auto mb-4 opacity-20" />
                        <p>{isToday ? "No tasks yet. Start your day!" : "No tasks for this date."}</p>
                    </div>
                )}
            </div>

            <form onSubmit={handleAdd} className="relative">
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={`Add task for ${isToday ? 'Today' : selectedDate}...`}
                    className="w-full p-4 pr-12 rounded-xl bg-surface-light dark:bg-surface-dark border border-gray-200 dark:border-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-lg"
                />
                <button 
                    type="submit"
                    className="absolute right-3 top-3 p-1 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                >
                    <Plus size={20} />
                </button>
            </form>
        </div>
    );
};
