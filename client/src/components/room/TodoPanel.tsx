import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { TodoItem } from '../../types';
import { Plus, Trash2, Circle, CheckCircle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useTranslation } from 'react-i18next';

// To-do Panel is a private, session-based task list allows progress tracking and resets when session ends

// Props for TodoPanel component
interface TodoPanelProps {
    roomId: string;
}

// Main TodoPanel component
const TodoPanel: React.FC<TodoPanelProps> = ({ roomId }) => {

    // Get current user info from AuthContext
    const { user } = useAuth();
    const { t } = useTranslation();

    // State to hold the list of todo items
    const [todos, setTodos] = useState<TodoItem[]>([]);

    // State for the new todo input field
    const [newItemText, setNewItemText] = useState('');

    // Load todos from sessionStorage on component mount or when roomId changes
    useEffect(() => {
        // Construct a unique key for this room's session storage
        // This ensures tasks are isolated per room but persist across refreshes
        const storageKey = `todo_session_${roomId}`;

        try {
            // Load todos from sessionStorage, survive across refresh but is gone when session ends
            const savedTodos = sessionStorage.getItem(storageKey);

            // If todos are found, 
            if (savedTodos) {
                // Parse the JSON string back into an array of TodoItems
                setTodos(JSON.parse(savedTodos));
            } else {
                // Initialize with empty array if no saved data found
                setTodos([]);
            }
        } catch (error) { // Error handling
            console.error('Failed to load todos from session storage:', error);
        }
    }, [roomId]); // Reload tasks when user switches room

    // Auto-save todos to sessionStorage whenever the todos list changes (added, completed or deleted)
    useEffect(() => {

        // Construct a unique key for this room's session storage
        const storageKey = `todo_session_${roomId}`;

        try {
            // Serialize the todos array to a JSON string for storage
            sessionStorage.setItem(storageKey, JSON.stringify(todos));
        } catch (error) { // Error handling
            console.error('Failed to save todos to session storage:', error);
        }
    }, [todos, roomId]);

    // Calculate percentage for task progress bar
    const totalTasks = todos.length;
    const completedTasks = todos.filter(t => t.completed).length;

    // Avoid division by zero, if total is 0, progress is 0
    const progressPercentage = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

    // Handle adding a new todo
    const handleAddTodo = (e: React.FormEvent) => {

        // Prevents reload on form submission
        e.preventDefault();

        // If no task or no user, do nothing
        if (!newItemText.trim() || !user) return;

        // Create new todo item
        const newTodo: TodoItem = {
            id: uuidv4(), // uuid is for react keys (so React knows which items changed) + avoid race conditions
            text: newItemText.trim(),
            completed: false,
            createdAt: Date.now(),
            createdBy: user.name,
            createdBySocketId: 'local', // Placeholder for local items
        };

        // Update local state, useEffect will handle saving to sessionStorage
        setTodos(prev => [...prev, newTodo]);

        // Clears the input field
        setNewItemText('');
    };

    // Handle toggling a todo's completion status
    const toggleTodo = (todoId: string) => {
        setTodos(prev => prev.map(item =>
            // Toggle the completed status if the ID matches
            item.id === todoId ? { ...item, completed: !item.completed } : item
        ));
    };

    // Handle deleting a todo
    const deleteTodo = (todoId: string) => {
        // Filter out the item with the matching ID, triggers auto-save effect
        setTodos(prev => prev.filter(item => item.id !== todoId));
    };

    return (
        // Render JSX
        <div className="flex flex-col h-full bg-slate-50/50 dark:bg-gray-800/50 rounded-lg overflow-hidden">

            {/* Header Section */}
            <div className="p-4 bg-white dark:bg-gray-900 border-b border-slate-100 dark:border-gray-800">
                <h3 className="font-semibold text-slate-800 dark:text-white mb-1">{t('virtualRoom.todo.title')}</h3>
                <p className="text-xs text-slate-500 dark:text-gray-400 mb-3">{t('virtualRoom.todo.subtitle')}</p>

                {/* Progress Tracker */}
                <div className="w-full bg-slate-100 dark:bg-gray-700 rounded-full h-2.5 mb-1">
                    <div
                        className="bg-indigo-600 dark:bg-indigo-400 h-2.5 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${progressPercentage}%` }}
                    ></div>
                </div>
                <div className="flex justify-between text-xs text-slate-500 dark:text-gray-400 font-medium">
                    <span>{progressPercentage}% {t('virtualRoom.todo.complete')}</span>
                    <span>{completedTasks}/{totalTasks} {t('virtualRoom.todo.validated')}</span>
                </div>
            </div>

            {/* Todo List Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {todos.length === 0 ? (
                    // If no todos, show message to encourage user to add todo
                    <div className="text-center text-slate-400 dark:text-gray-500 mt-10">
                        <p>{t('virtualRoom.todo.noGoals')}</p>
                        <p className="text-xs mt-1">{t('virtualRoom.todo.getStarted')}</p>
                    </div>
                ) : ( // If got todos, show list of todos
                    todos.map((todo) => (

                        <div
                            key={todo.id}
                            className={`group flex items-center p-3 rounded-xl border transition-all ${todo.completed
                                ? 'bg-indigo-50/50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800'
                                : 'bg-white dark:bg-gray-800 border-slate-200 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-700 shadow-sm'
                                }`}
                        >
                            {/* Todo Item */}
                            <button
                                onClick={() => toggleTodo(todo.id)}
                                className={`mr-3 flex-shrink-0 transition-colors ${todo.completed ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-300 dark:text-gray-600 group-hover:text-indigo-400 dark:group-hover:text-indigo-400'
                                    }`}
                            >
                                {/* Todo Item Checkbox */}
                                {todo.completed ? (
                                    <CheckCircle className="w-5 h-5 fill-indigo-100 dark:fill-indigo-900/50" />
                                ) : (
                                    <Circle className="w-5 h-5" />
                                )}
                            </button>

                            {/* Todo Item Text */}
                            <span
                                className={`flex-1 text-sm transition-all ${todo.completed
                                    ? 'text-slate-400 dark:text-gray-500 line-through decoration-slate-300 dark:decoration-gray-600'
                                    : 'text-slate-700 dark:text-gray-300 font-medium'
                                    }`}
                            >
                                {todo.text}
                            </span>

                            {/* Todo Item Delete Button */}
                            <button
                                onClick={() => deleteTodo(todo.id)}
                                className="ml-2 text-slate-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg"
                                title={t('virtualRoom.todo.deleteTask')}
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))
                )}
            </div>

            {/* Input Area */}
            <form onSubmit={handleAddTodo} className="p-4 bg-white dark:bg-gray-900 border-t border-slate-100 dark:border-gray-800">
                {/* Input Field */}
                <div className="relative">
                    <input
                        type="text"
                        value={newItemText}
                        onChange={(e) => setNewItemText(e.target.value)}
                        onKeyDown={(e) => e.stopPropagation()}
                        inputMode="text"
                        enterKeyHint="done"
                        placeholder={t('virtualRoom.todo.addGoal')}
                        className="w-full pl-4 pr-10 py-2.5 text-sm bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-indigo-400/20 focus:border-indigo-500 dark:focus:border-indigo-400 transition-all text-slate-700 dark:text-gray-300 placeholder:text-slate-400 dark:placeholder:text-gray-500"
                    />

                    {/* Add Button */}
                    <button
                        type="submit"
                        disabled={!newItemText.trim()}
                        className="absolute right-1.5 top-1.5 p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </div>
            </form>
        </div>
    );
};

export default TodoPanel;
