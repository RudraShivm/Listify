import React, { useState } from 'react';
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

            {isOpen && (
                <div className="absolute z-50 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
                    <DayPicker
                        mode="single"
                        selected={selectedDate}
                        onSelect={handleSelect}
                        className="text-sm"
                        classNames={{
                            months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                            month: "space-y-4",
                            caption: "flex justify-between pt-1 relative items-center",
                            caption_label: "text-sm font-medium text-gray-900 dark:text-gray-100",
                            nav: "space-x-1 flex items-center",
                            nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 text-gray-900 dark:text-gray-100",
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
                    <div className="flex justify-end mt-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                        <button
                            onClick={() => setIsOpen(false)}
                            className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {isOpen && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsOpen(false)}
                />
            )}
        </div>
    );
};
