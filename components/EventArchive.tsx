import React from 'react';
import { useStore } from '../context/Store';
import { ViewType } from '../types';
import { format, isBefore } from 'date-fns';
import { Calendar as CalendarIcon, ArrowLeft, Trash2, RotateCcw, AlertTriangle } from 'lucide-react';

export const EventArchive = () => {
    const { archivedEvents, restoreEvent, permanentlyDeleteEvent, setCurrentView, notes } = useStore();

    const handleRestore = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (window.confirm("Restore this event to active events?")) {
            restoreEvent(id);
        }
    };

    const handlePermanentDelete = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const event = archivedEvents.find(ev => ev.id === id);
        if (!event) return;

        // Check for referenced notes
        const archivedNotes = JSON.parse(localStorage.getItem('archivedNotes') || '[]');
        const allNotes = [...archivedNotes, ...notes];
        const referencedNotes = allNotes.filter((note: any) => note.referencedEventIds?.includes(id));


        let message = "Permanently delete this event? This action cannot be undone.";
        if (referencedNotes.length > 0) {
            message += `\n\nThis event is referenced in ${referencedNotes.length} note(s). Deleting it will remove the event link from those notes.`;
        }

        if (window.confirm(message)) {
            permanentlyDeleteEvent(id);
        }
    };

    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setCurrentView(ViewType.EVENTS)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <h2 className="text-2xl font-semibold text-text-primary dark:text-text-darkPrimary">Archived Events</h2>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pb-20">
                {archivedEvents.length === 0 ? (
                    <div className="text-center py-20 text-gray-400">
                        <Trash2 size={48} className="mx-auto mb-4 opacity-20" />
                        <p>No archived events.</p>
                        <p className="text-sm mt-2">Events you archive will appear here.</p>
                    </div>
                ) : (
                    archivedEvents.map(ev => {
                        const date = new Date(ev.startTime);
                        const isPast = isBefore(date, new Date());

                        return (
                            <div
                                key={ev.id}
                                className={`flex items-center gap-4 p-4 bg-surface-light dark:bg-surface-dark rounded-xl border border-gray-100 dark:border-gray-800 hover:border-primary/50 cursor-pointer transition-colors group ${isPast ? 'opacity-60' : ''}`}
                            >
                                <div className="flex flex-col items-center justify-center w-14 h-14 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <span className="text-xs uppercase font-bold text-gray-500">{format(date, 'MMM')}</span>
                                    <span className="text-xl font-bold text-primary">{format(date, 'd')}</span>
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-semibold text-text-primary dark:text-text-darkPrimary">{ev.title}</h3>
                                        <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 px-2 py-0.5 rounded">ARCHIVED</span>
                                    </div>
                                    <div className="text-sm text-gray-500 flex items-center gap-2">
                                        <span>{format(date, 'EEEE, h:mm a')}</span>
                                        <span className="text-xs text-gray-400">
                                            Archived {format(new Date(ev.archivedAt), 'MMM d, yyyy')}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex gap-2 items-center">
                                    <div className="flex gap-1">
                                        {ev.tags.map(tId => {
                                            // We can't access tags here easily, so skip for now
                                            return null;
                                        })}
                                    </div>
                                    <button
                                        onClick={(e) => handleRestore(e, ev.id)}
                                        className="p-2 text-blue-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                                        title="Restore event"
                                    >
                                        <RotateCcw size={18} />
                                    </button>
                                    <button
                                        onClick={(e) => handlePermanentDelete(e, ev.id)}
                                        className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                        title="Permanently delete"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};
