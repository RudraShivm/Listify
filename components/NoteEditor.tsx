
import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../context/Store';
import { Note, Event, ViewType, Tag } from '../types';
import { Plus, X, Calendar as CalendarIcon, Trash2, Bold, Italic, List, ChevronLeft, Heading, Quote, Code, Link, Tag as TagIcon, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { format } from 'date-fns';
import { htmlToMarkdown, markdownToHtml } from '../utils/appUtils';

export const NoteEditor = ({ noteId, onClose }: { noteId?: string; onClose: () => void }) => {
  const { notes, addNote, updateNote, archiveNote, events, setSelectedEventId, setSelectedNoteId, setCurrentView, showToast, settings, setFocusModeActive, tags, addTag, setDraftEvent, restoreEvent } = useStore();
  
  // Use a stable internal ID to prevent creating duplicates during autosave
  const [internalId] = useState(noteId && noteId !== 'new' ? noteId : crypto.randomUUID());
  
  const existingNote = notes.find(n => n.id === internalId);
  
  const [title, setTitle] = useState(existingNote?.title || '');
  const [selectedTags, setSelectedTags] = useState<string[]>(existingNote?.tags || []);
  const [showEventModalSheet, setShowEventModalSheet] = useState(false);
  const [showTagInput, setShowTagInput] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [selectedCodeLanguage, setSelectedCodeLanguage] = useState('javascript');
  
  const editorRef = useRef<HTMLDivElement>(null);
  // Fix: Replaced NodeJS.Timeout with ReturnType<typeof setTimeout> to resolve type error in browser environment
  const focusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activeFormats, setActiveFormats] = useState<string[]>([]);

  // Initialize content once. Updates will happen via ref to avoid re-render cursor jumps.
  useEffect(() => {
      if (editorRef.current) {
          editorRef.current.innerHTML = existingNote ? markdownToHtml(existingNote.content) : '';
      }
  }, [internalId]); // Only reset if ID changes completely (e.g. switching notes)

  // Listen for selection changes to update toolbar state
  useEffect(() => {
      const handleSelectionChange = () => {
          checkActiveFormats();
      };
      document.addEventListener('selectionchange', handleSelectionChange);
      return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

  const saveContent = () => {
    // Don't save if empty new note
    if (!editorRef.current) return;
    const currentHtml = editorRef.current.innerHTML;
    
    // Simple check to see if content is just empty tag or whitespace
    const isEmptyContent = currentHtml.replace(/<[^>]*>/g, '').trim() === '';
    if (!title.trim() && isEmptyContent && selectedTags.length === 0) return; 

    // Extract IDs from data attributes
    const matches = currentHtml.matchAll(/data-event-id="([a-zA-Z0-9-]+)"/g);
    const referencedIds = Array.from(matches, m => m[1]);

    const noteData: Note = {
        id: internalId,
        title: title || 'Untitled Note',
        content: htmlToMarkdown(currentHtml),
        tags: selectedTags,
        referencedEventIds: referencedIds,
        createdAt: existingNote?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    if (existingNote) {
        updateNote(noteData);
    } else {
        // If this is the first save of a new note, we need to ensure the store knows
        // this ID is now active so we don't keep creating new ones.
        addNote(noteData);
        // Important: Update the parent's pointer to this note ID so it knows it exists
        if (noteId === 'new') {
            setSelectedNoteId(internalId); 
        }
    }
  };

  // Auto-save
  useEffect(() => {
    const timer = setTimeout(saveContent, 1000); // Debounce save
    return () => clearTimeout(timer);
  }, [title, selectedTags]); 

  const handleInput = () => {
      // Focus Mode Logic
      if (settings.focusMode) {
          setFocusModeActive(true);
          if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
          focusTimerRef.current = setTimeout(() => {
              setFocusModeActive(false);
          }, 60000);
      }
      
      // Trigger autosave logic
      if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
      focusTimerRef.current = setTimeout(saveContent, 1500);
  };

  const handleBack = () => {
      saveContent();
      onClose(); // Parent handles navigation back
  };

  const execCmd = (cmd: string, val: string = '') => {
      editorRef.current?.focus();
      document.execCommand(cmd, false, val);
      checkActiveFormats();
      handleInput();
  };

  // Toggle block formatting (heading/quote)
  const toggleBlockFormat = (blockType: string) => {
      editorRef.current?.focus();

      const currentBlock = document.queryCommandValue('formatBlock');
      if (currentBlock && currentBlock.toLowerCase() === blockType.toLowerCase()) {
          // Already in this block type, convert to paragraph
          document.execCommand('formatBlock', false, 'div');
      } else {
          // Apply the block formatting
          document.execCommand('formatBlock', false, blockType);
      }

      checkActiveFormats();
      handleInput();
  };

  // Insert code block
  const insertCodeBlock = (language: string) => {
      editorRef.current?.focus();

      // Insert code block with a paragraph break after it so cursor moves outside
      const codeBlock = `<pre><code class="language-${language}">\n\n</code></pre><p><br></p>`;
      document.execCommand('insertHTML', false, codeBlock);

      setShowCodeModal(false);
      handleInput();
  };

  const checkActiveFormats = () => {
      const formats = [];
      if (document.queryCommandState('bold')) formats.push('bold');
      if (document.queryCommandState('italic')) formats.push('italic');
      if (document.queryCommandState('insertUnorderedList')) formats.push('list');
      if (document.queryCommandState('insertOrderedList')) formats.push('orderedList');
      if (document.queryCommandState('justifyLeft')) formats.push('justifyLeft');
      if (document.queryCommandState('justifyCenter')) formats.push('justifyCenter');
      if (document.queryCommandState('justifyRight')) formats.push('justifyRight');

      // formatBlock check
      const blockValue = document.queryCommandValue('formatBlock');
      if (blockValue && (blockValue.toLowerCase() === 'h3' || blockValue.toLowerCase() === 'heading')) formats.push('heading');
      if (blockValue && (blockValue.toLowerCase() === 'blockquote')) formats.push('quote');

      setActiveFormats(formats);
  };

  const insertEventLink = (event: Event) => {
      editorRef.current?.focus();
      // Using a specialized structure for the event link
      const html = `<span contenteditable="false" data-event-id="${event.id}" class="inline-flex items-center gap-1 bg-primary/10 text-primary px-2 py-0.5 rounded-md text-sm font-medium align-middle mx-1 select-none cursor-pointer event-link" style="color: #4A5F7A; background-color: rgba(74, 95, 122, 0.1); border-radius: 4px; padding: 2px 6px; font-weight: 500;">📅 ${event.title}</span>&nbsp;`;
      document.execCommand('insertHTML', false, html);
      setShowEventModalSheet(false);
      handleInput();
  };

  const handleEditorClick = (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      // Check if clicked element or its parent is an event link
      const linkElement = target.closest('[data-event-id]');
      if (linkElement) {
          const eventId = linkElement.getAttribute('data-event-id');
          if (eventId) {
              e.preventDefault();
              e.stopPropagation();

              // Check if event exists in active events
              const activeEvent = events.find(ev => ev.id === eventId);

              if (activeEvent) {
                  // Event exists and is active
                  saveContent();
                  setSelectedEventId(eventId);
                  setCurrentView(ViewType.EVENT_EDIT);
              } else {
                  // Check if event is archived
                  const archivedEvents = JSON.parse(localStorage.getItem('archivedEvents') || '[]');
                  const archivedEvent = archivedEvents.find((ev: any) => ev.id === eventId);

                  if (archivedEvent) {
                      // Event is archived, ask user if they want to restore
                      const shouldRestore = window.confirm(`This event "${archivedEvent.title}" is archived. Would you like to restore it and open it for editing?`);
                      if (shouldRestore) {
                          // Restore the event using the store function
                          restoreEvent(eventId);

                          saveContent();
                          setSelectedEventId(eventId);
                          setCurrentView(ViewType.EVENT_EDIT);
                          showToast(`Event "${archivedEvent.title}" restored`, 'success');
                      }
                  } else {
                      // Check if event was permanently deleted
                      const permanentlyDeleted = JSON.parse(localStorage.getItem('permanentlyDeletedMoodleEventIds') || '[]');
                      const isPermanentlyDeleted = permanentlyDeleted.includes(eventId);

                      if (isPermanentlyDeleted) {
                          showToast('This event has been permanently deleted and no longer exists.', 'error');
                          // Remove the broken link from the HTML
                          if (linkElement && linkElement.parentNode) {
                              linkElement.parentNode.removeChild(linkElement);
                              handleInput(); // Trigger save
                          }
                      } else {
                          showToast('Event not found.', 'error');
                          // Remove the broken link from the HTML
                          if (linkElement && linkElement.parentNode) {
                              linkElement.parentNode.removeChild(linkElement);
                              handleInput(); // Trigger save
                          }
                      }
                  }
              }
          }
      }
  };

  const handleAddTag = () => {
      if (!newTagName.trim()) return;
      // Check if tag exists
      let tagId = tags.find(t => t.name.toLowerCase() === newTagName.toLowerCase())?.id;
      
      if (!tagId) {
          tagId = crypto.randomUUID();
          addTag({ id: tagId, name: newTagName, color: '#4A5F7A' }); // Default color
      }
      
      if (!selectedTags.includes(tagId)) {
          setSelectedTags([...selectedTags, tagId]);
      }
      setNewTagName('');
      setShowTagInput(false);
  };

  // Ensure cleanup
  useEffect(() => {
      return () => {
          if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
          setFocusModeActive(false);
      };
  }, []);

  return (
    <div className="flex flex-col h-full bg-surface-light dark:bg-surface-dark rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
      
      {/* Top Bar */}
      <div className="flex flex-col border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-2 flex-1">
                <button onClick={handleBack} className="mr-2 text-gray-500 hover:text-primary">
                    <ChevronLeft size={24}/>
                </button>
                <input 
                    type="text" 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Note Title"
                    className="text-xl font-semibold bg-transparent border-none focus:outline-none placeholder-gray-400 text-text-primary dark:text-text-darkPrimary w-full"
                />
            </div>
            {existingNote && (
                <button onClick={() => {
                    if (window.confirm("Archive this note? It will be moved to archived notes where you can restore or permanently delete it later.")) {
                        archiveNote(existingNote.id);
                        onClose();
                    }
                }} className="text-red-400 hover:bg-red-50 p-2 rounded-lg">
                    <Trash2 size={18} />
                </button>
            )}
          </div>
          
          {/* Tags Section */}
          <div className="px-6 pb-3 flex flex-wrap gap-2 items-center">
              {selectedTags.map(tagId => {
                  const tag = tags.find(t => t.id === tagId);
                  if (!tag) return null;
                  return (
                      <span key={tagId} className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary flex items-center gap-1">
                          {tag.name}
                          <button onClick={() => setSelectedTags(selectedTags.filter(id => id !== tagId))} className="hover:text-red-500"><X size={12}/></button>
                      </span>
                  );
              })}
              
              {showTagInput ? (
                  <div className="flex items-center gap-1 animate-in fade-in">
                      <input 
                          autoFocus
                          type="text" 
                          value={newTagName}
                          onChange={(e) => setNewTagName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                          placeholder="Tag name"
                          className="text-xs p-1 rounded border border-primary/30 bg-transparent focus:outline-none w-20"
                      />
                      <button onClick={handleAddTag} className="text-primary hover:bg-primary/10 p-1 rounded"><Plus size={14}/></button>
                      <button onClick={() => setShowTagInput(false)} className="text-gray-400 hover:text-red-400 p-1"><X size={14}/></button>
                  </div>
              ) : (
                  <button onClick={() => setShowTagInput(true)} className="text-xs text-gray-400 hover:text-primary flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-50 dark:hover:bg-gray-800">
                      <TagIcon size={12}/> Add Tag
                  </button>
              )}
          </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 overflow-x-auto">
          <ToolbarBtn icon={<Bold size={16}/>} onClick={() => execCmd('bold')} label="Bold" active={activeFormats.includes('bold')}/>
          <ToolbarBtn icon={<Italic size={16}/>} onClick={() => execCmd('italic')} label="Italic" active={activeFormats.includes('italic')}/>
          <div className="w-px h-4 bg-gray-300 dark:bg-gray-700 mx-2"/>
          <ToolbarBtn icon={<AlignLeft size={16}/>} onClick={() => execCmd('justifyLeft')} label="Align Left" active={activeFormats.includes('justifyLeft')}/>
          <ToolbarBtn icon={<AlignCenter size={16}/>} onClick={() => execCmd('justifyCenter')} label="Align Center" active={activeFormats.includes('justifyCenter')}/>
          <ToolbarBtn icon={<AlignRight size={16}/>} onClick={() => execCmd('justifyRight')} label="Align Right" active={activeFormats.includes('justifyRight')}/>
          <div className="w-px h-4 bg-gray-300 dark:bg-gray-700 mx-2"/>
          <ToolbarBtn icon={<Heading size={16}/>} onClick={() => toggleBlockFormat('h3')} label="Heading" active={activeFormats.includes('heading')}/>
          <ToolbarBtn icon={<Quote size={16}/>} onClick={() => toggleBlockFormat('blockquote')} label="Quote" active={activeFormats.includes('quote')}/>
          <ToolbarBtn icon={<Code size={16}/>} onClick={() => setShowCodeModal(true)} label="Code Block" active={false}/>
          <ToolbarBtn icon={<List size={16}/>} onClick={() => execCmd('insertUnorderedList')} label="Bullet List" active={activeFormats.includes('list')}/>
          <ToolbarBtn icon={<span className="text-xs font-bold">1.</span>} onClick={() => execCmd('insertOrderedList')} label="Numbered List" active={activeFormats.includes('orderedList')}/>
          <div className="w-px h-4 bg-gray-300 dark:bg-gray-700 mx-2"/>
          <button 
            onClick={() => setShowEventModalSheet(true)}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10 rounded"
          >
              <CalendarIcon size={14}/> Link Event
          </button>
      </div>

      {/* Editor Area - UNCONTROLLED div to prevent cursor jumping */}
      {/* Added editor-content class for styling lists/headings */}
      <div 
        className="flex-1 p-6 overflow-y-auto cursor-text editor-content" 
        onClick={() => editorRef.current?.focus()}
      >
          <div
            ref={editorRef}
            contentEditable
            onInput={handleInput}
            onClick={handleEditorClick}
            className="prose dark:prose-invert max-w-none focus:outline-none min-h-[50vh] outline-none"
            data-placeholder="Start writing..."
            suppressContentEditableWarning={true}
          />
      </div>

      {/* Event Link Sheet - FIXED Position and Z-Index */}
      {showEventModalSheet && (
          <div className="fixed inset-0 z-[100] bg-black/20 backdrop-blur-sm flex items-end md:items-center justify-center p-4">
              <div 
                className="bg-surface-light dark:bg-surface-dark w-full max-w-md rounded-2xl shadow-xl flex flex-col max-h-[60%] animate-in slide-in-from-bottom-10 mb-20 md:mb-0 border border-gray-200 dark:border-gray-800"
                onClick={(e) => e.stopPropagation()}
              >
                  <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                      <span className="font-semibold">Insert Event Reference</span>
                      <button onClick={() => setShowEventModalSheet(false)}><X size={20}/></button>
                  </div>
                  <div className="p-2 overflow-y-auto">
                      <button 
                        onClick={() => { 
                            setShowEventModalSheet(false); 
                            saveContent(); 
                            // When creating a new event from note, we want to return to this note eventually.
                            // We can rely on the fact that NotesList remembers the selectedNoteId if we don't clear it in Store?
                            // But CurrentView changes to EVENT_EDIT.
                            // The EventEditor handles the return via goBack(), which pops history.
                            setCurrentView(ViewType.EVENT_EDIT); 
                        }}
                        className="w-full text-left px-4 py-3 text-primary hover:bg-primary/5 rounded-xl font-medium flex items-center gap-2 border border-dashed border-primary/30 mb-2"
                      >
                          <Plus size={16} /> Create New Event
                      </button>
                      {events.map(ev => (
                          <button key={ev.id} onClick={() => insertEventLink(ev)} className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl">
                              <div className="font-medium">{ev.title}</div>
                              <div className="text-xs text-gray-500">{format(new Date(ev.startTime), 'MMM d, h:mm a')}</div>
                          </button>
                      ))}
                  </div>
              </div>
          </div>
      )}

      {/* Code Language Selector Modal */}
      {showCodeModal && (
        <div className="fixed inset-0 z-[100] bg-black/20 backdrop-blur-sm flex items-end md:items-center justify-center p-4">
          <div
            className="bg-surface-light dark:bg-surface-dark w-full max-w-md rounded-2xl shadow-xl flex flex-col max-h-[60%] animate-in slide-in-from-bottom-10 mb-20 md:mb-0 border border-gray-200 dark:border-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
              <h3 className="font-semibold text-text-light dark:text-text-dark">Select Code Language</h3>
              <button onClick={() => setShowCodeModal(false)}><X size={20}/></button>
            </div>
            <div className="p-4 overflow-y-auto space-y-2">
              {[
                'javascript', 'typescript', 'python', 'java', 'cpp', 'c', 'csharp', 'php', 'ruby', 'go', 'rust',
                'swift', 'kotlin', 'dart', 'scala', 'html', 'css', 'scss', 'sass', 'less', 'json', 'xml', 'yaml',
                'markdown', 'sql', 'bash', 'powershell', 'dockerfile', 'makefile', 'plaintext'
              ].map(lang => (
                <button
                  key={lang}
                  onClick={() => insertCodeBlock(lang)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl capitalize"
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ToolbarBtn = ({ icon, onClick, label, active }: any) => (
    <button 
        onMouseDown={(e) => { e.preventDefault(); onClick(); }} 
        className={`p-2 rounded transition-colors ${active ? 'bg-primary/20 text-primary' : 'text-gray-500 hover:text-primary hover:bg-gray-200 dark:hover:bg-gray-700'}`}
        title={label}
    >
        {icon}
    </button>
);

export const NotesList = () => {
    const { notes, searchQuery, selectedNoteId, setSelectedNoteId, setCurrentView, goBack, tags, draftEvent, currentView } = useStore();

    // Filter by Title OR Tags (matching tag name with search query)
    const filtered = notes.filter(n => {
        const q = searchQuery.toLowerCase();
        if (!q) return true;
        
        // Check title match
        if (n.title.toLowerCase().includes(q)) return true;
        
        // Check tags match
        // Find tag IDs where name includes q
        const matchingTagIds = tags.filter(t => t.name.toLowerCase().includes(q)).map(t => t.id);
        // Check if note has any of those tag IDs
        return n.tags.some(tagId => matchingTagIds.includes(tagId));
    });

    const handleClose = () => {
        setSelectedNoteId(null);
        
        // Logic: If we have a draft event (meaning we came from EventEditor to create a note),
        // we should go back to the Event Editor.
        // Also check if we should go back to a previous view (like Calendar)
        if (draftEvent) {
            goBack();
        }
    };

    // If a note is selected, show the editor.
    if (selectedNoteId) {
        return (
            <div className="h-full flex flex-col">
                <div className="flex-1">
                    <NoteEditor 
                        noteId={selectedNoteId} 
                        onClose={handleClose} 
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
             <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold">Notes</h2>
                <div className="flex gap-2">
                    <button onClick={() => setCurrentView(ViewType.NOTE_ARCHIVE)} className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium shadow-sm">
                        <Trash2 size={18} /> Archived
                    </button>
                    <button onClick={() => setSelectedNoteId('new')} className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium shadow-sm">
                        <Plus size={18} /> New Note
                    </button>
                </div>
             </div>
             
             {/* Tag Cloud for Filtering Suggestion */}
             {searchQuery && (
                 <div className="mb-4 flex flex-wrap gap-2">
                     <span className="text-xs text-gray-500 self-center">Matches found: {filtered.length}</span>
                 </div>
             )}

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto pb-20">
                 {filtered.map(note => (
                     <div key={note.id} onClick={() => setSelectedNoteId(note.id)} className="bg-surface-light dark:bg-surface-dark p-5 rounded-xl border border-gray-200 dark:border-gray-800 hover:shadow-md cursor-pointer h-auto min-h-[160px] flex flex-col transition-all group">
                         <h3 className="font-semibold text-lg mb-2 line-clamp-1">{note.title}</h3>
                         <div className="text-sm text-gray-500 line-clamp-6 flex-1 opacity-70 prose prose-sm max-w-none dark:prose-invert"
                              dangerouslySetInnerHTML={{ __html: markdownToHtml(note.content) }}
                         />
                         <div className="mt-4 text-xs text-gray-400 flex justify-between items-center">
                             <span>{format(new Date(note.updatedAt), 'dd/MM/yyyy')}</span>
                             <div className="flex gap-1">
                                 {note.tags.map(tId => {
                                     const tag = tags.find(t => t.id === tId);
                                     return tag ? <div key={tId} className="w-2 h-2 rounded-full" style={{backgroundColor: tag.color}} title={tag.name}/> : null;
                                 })}
                             </div>
                         </div>
                     </div>
                 ))}
             </div>
        </div>
    );
};
