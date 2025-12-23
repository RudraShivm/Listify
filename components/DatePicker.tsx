import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { DayPicker } from 'react-day-picker';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';

import 'react-day-picker/style.css';

interface DatePickerProps {
    value: string;
    onChange: (date: string) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
}

export const DatePicker: React.FC<DatePickerProps> = ({
    value,
    onChange,
    placeholder = "Select date",
    className = "",
    disabled = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(
        value ? new Date(value) : undefined
    );
    const [modalPosition, setModalPosition] = useState({ top: 0, left: 0, position: 'bottom' as 'top' | 'bottom' });
    const buttonRef = useRef<HTMLButtonElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);

    // Sync selectedDate with value prop
    useEffect(() => {
        setSelectedDate(value ? new Date(value) : undefined);
    }, [value]);

    // Calculate modal position based on button location and available space
    useEffect(() => {
        if (isOpen && buttonRef.current) {
            const buttonRect = buttonRef.current.getBoundingClientRect();
            const modalHeight = 280; // More compact height
            const modalWidth = 280;

            // Try to position below first
            const spaceBelow = window.innerHeight - buttonRect.bottom;
            const spaceAbove = buttonRect.top;

            let top = buttonRect.bottom + 4; // Default: below
            let left = buttonRect.left;
            let position: 'top' | 'bottom' = 'bottom';

            // If not enough space below but enough above, position above
            if (spaceBelow < modalHeight && spaceAbove >= modalHeight) {
                top = buttonRect.top - modalHeight - 4;
                position = 'top';
            }

            // Adjust horizontal position to stay within viewport
            if (left + modalWidth > window.innerWidth) {
                left = window.innerWidth - modalWidth - 8;
            }
            if (left < 8) {
                left = 8;
            }

            setModalPosition({ top, left, position });
        }
    }, [isOpen]);

    const handleSelect = (date: Date | undefined) => {
        setSelectedDate(date);
        if (date) {
            const formattedDate = format(date, 'yyyy-MM-dd');
            onChange(formattedDate);
        } else {
            onChange('');
        }
        setIsOpen(false);
    };

    const displayValue = selectedDate
        ? format(selectedDate, 'dd/MM/yyyy')
        : placeholder;

    return (
        <div className={`relative ${className}`}>
            <button
                ref={buttonRef}
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                disabled={disabled}
                className={`
          w-full flex items-center justify-between p-2.5 text-left border border-gray-200 dark:border-gray-700
          rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
          hover:border-gray-300 dark:hover:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/20
          disabled:opacity-50 disabled:cursor-not-allowed
          ${className}
        `}
            >
                <span className={selectedDate ? '' : 'text-gray-500'}>
                    {displayValue}
                </span>
                <CalendarIcon size={16} className="text-gray-400" />
            </button>

            {isOpen && createPortal(
                <div
                    ref={modalRef}
                    className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3"
                    style={{
                        top: modalPosition.top,
                        left: modalPosition.left,
                        position: 'fixed'
                    }}
                >
                    <DayPicker
                        mode="single"
                        selected={selectedDate}
                        onSelect={handleSelect}
                        className="text-sm"
                        classNames={{
                            months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                            month: "space-y-2", // Reduced spacing
                            caption: "flex justify-center pt-2 relative items-center", // Center the month/year
                            caption_label: "text-sm font-medium text-gray-900 dark:text-gray-100",
                            nav: "absolute top-2 right-2 space-x-1 flex items-center", // Position nav at top-right
                            nav_button: "h-6 w-6 bg-transparent p-0 opacity-50 hover:opacity-100 text-gray-900 dark:text-gray-100", // Smaller buttons
                            nav_button_previous: "",
                            nav_button_next: "",
                            table: "w-full border-collapse space-y-1",
                            head_row: "flex",
                            head_cell: "text-gray-500 dark:text-gray-400 rounded-md w-9 font-normal text-[0.8rem]",
                            row: "flex w-full mt-2",
                            cell: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-primary/10 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                            day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md",
                            day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                            day_today: "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100",
                            day_outside: "text-gray-500 dark:text-gray-400 opacity-50",
                            day_disabled: "text-gray-500 dark:text-gray-400 opacity-50",
                            day_range_middle: "aria-selected:bg-primary/10 aria-selected:text-primary",
                            day_hidden: "invisible",
                        }}
                    />
                    <div className="flex justify-end mt-2 pt-2 border-t border-gray-200 dark:border-gray-700"> {/* Reduced margin */}
                        <button
                            onClick={() => setIsOpen(false)}
                            className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                        >
                            Cancel
                        </button>
                    </div>
                </div>,
                document.body
            )}

            {isOpen && createPortal(
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsOpen(false)}
                />,
                document.body
            )}
        </div>
    );
};
