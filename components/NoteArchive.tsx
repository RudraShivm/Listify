import React from 'react';
import { useStore } from '../context/Store';
import { ViewType } from '../types';
import { format } from 'date-fns';
import { ArrowLeft, Trash2, RotateCcw, BookOpen } from 'lucide-react';
import { markdownToHtml } from '../utils/appUtils';

export const NoteArchive = () => {
    const { archivedNotes, restoreNote, permanentlyDeleteNote, setCurrentView, events } = useStore();

    const handleRestore = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (window.confirm("Restore this note to active notes?")) {
            restoreNote(id);
        }
    };

    const handlePermanentDelete = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const note = archivedNotes.find(n => n.id === id);
        if (!note) return;

        // Check for referenced events (both active and archived)
        const archivedEvents = JSON.parse(localStorage.getItem('archivedEvents') || '[]');
        const allEvents = [...archivedEvents, ...events];
        const referencedEvents = allEvents.filter((ev: any) => ev.linkedNoteIds?.includes(id));

        let message = "Permanently delete this note? This action cannot be undone.";
        if (referencedEvents.length > 0) {
            message += `\n\nThis note is referenced by ${referencedEvents.length} event(s). Deleting it will remove the note link from those events.`;
        }

        if (window.confirm(message)) {
            permanentlyDeleteNote(id);
        }
    };

    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setCurrentView(ViewType.NOTES)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <h2 className="text-2xl font-semibold text-text-primary dark:text-text-darkPrimary">Archived Notes</h2>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pb-20">
                {archivedNotes.length === 0 ? (
                    <div className="text-center py-20 text-gray-400">
                        <Trash2 size={48} className="mx-auto mb-4 opacity-20" />
                        <p>No archived notes.</p>
                        <p className="text-sm mt-2">Notes you archive will appear here.</p>
                    </div>
                ) : (
                    archivedNotes.map(note => (
                        <div
                            key={note.id}
                            className="bg-surface-light dark:bg-surface-dark p-5 rounded-xl border border-gray-200 dark:border-gray-800 hover:shadow-md cursor-pointer h-auto min-h-[160px] flex flex-col transition-all group"
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-semibold text-lg line-clamp-1">{note.title}</h3>
                                <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 px-2 py-0.5 rounded">ARCHIVED</span>
                            </div>
                            <div className="text-sm text-gray-500 line-clamp-4 flex-1 opacity-70 prose prose-sm max-w-none dark:prose-invert"
                                 dangerouslySetInnerHTML={{ __html: markdownToHtml(note.content) }}
                            />
                            <div className="mt-4 text-xs text-gray-400 flex justify-between items-center">
                                <span>Archived {format(new Date(note.archivedAt), 'MMM d, yyyy')}</span>
                                <div className="flex gap-1">
                                    {note.tags.map(tId => {
                                        // We can't access tags here easily, so skip for now
                                        return null;
                                    })}
                                </div>
                            </div>

                            <div className="flex gap-2 mt-3 justify-end">
                                <button
                                    onClick={(e) => handleRestore(e, note.id)}
                                    className="p-2 text-blue-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                                    title="Restore note"
                                >
                                    <RotateCcw size={16} />
                                </button>
                                <button
                                    onClick={(e) => handlePermanentDelete(e, note.id)}
                                    className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                    title="Permanently delete"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
