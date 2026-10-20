'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Day, DAYS_LIST, Section } from '../types';
import {
  ManualScheduleInput,
  validateManualSchedule,
  extractLabSlotsFromSections,
} from '../lib/fixedCourses';
import { X, Clock, Calendar, Check, AlertCircle } from 'lucide-react';

interface ManualScheduleModalProps {
  isOpen: boolean;
  courseCode: string;
  courseTitle?: string;
  initialSchedule?: ManualScheduleInput | null;
  sections: Section[];
  onSave: (schedule: ManualScheduleInput) => void;
  onCancel: () => void;
}

export function ManualScheduleModal({
  isOpen,
  courseCode,
  courseTitle = 'Final Year Design Project',
  initialSchedule,
  sections,
  onSave,
  onCancel,
}: ManualScheduleModalProps) {
  const [section, setSection] = useState(initialSchedule?.section || 'I');
  const [selectedDays, setSelectedDays] = useState<Day[]>(
    initialSchedule?.days?.length ? initialSchedule.days : ['Sat']
  );
  const [startTime, setStartTime] = useState(initialSchedule?.startTime || '11:11');
  const [endTime, setEndTime] = useState(initialSchedule?.endTime || '13:40');
  const [room, setRoom] = useState(initialSchedule?.room || '');
  const [faculty, setFaculty] = useState(initialSchedule?.faculty || '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const modalRef = useRef<HTMLDivElement>(null);
  const sectionInputRef = useRef<HTMLInputElement>(null);

  // Derive dynamic real lab slots from dataset
  const labSlots = React.useMemo(() => extractLabSlotsFromSections(sections), [sections]);

  // Reset form when modal opens or initialSchedule changes
  useEffect(() => {
    if (isOpen) {
      setSection(initialSchedule?.section || 'I');
      setSelectedDays(initialSchedule?.days?.length ? initialSchedule.days : ['Sat']);
      setStartTime(initialSchedule?.startTime || '11:11');
      setEndTime(initialSchedule?.endTime || '13:40');
      setRoom(initialSchedule?.room || '');
      setFaculty(initialSchedule?.faculty || '');
      setErrors({});

      setTimeout(() => {
        sectionInputRef.current?.focus();
        sectionInputRef.current?.select();
      }, 50);
    }
  }, [isOpen, initialSchedule]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const toggleDay = (day: Day) => {
    setSelectedDays((prev) => {
      if (prev.includes(day)) {
        if (prev.length === 1) return prev; // Keep at least one
        return prev.filter((d) => d !== day);
      } else {
        return [...prev, day];
      }
    });
  };

  const handleLabSlotSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (!val) return;
    const chosen = labSlots.find((s) => `${s.start}-${s.end}` === val);
    if (chosen) {
      setStartTime(chosen.startTime);
      setEndTime(chosen.endTime);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const candidate: ManualScheduleInput = {
      courseCode,
      section: section.trim().toUpperCase(),
      days: selectedDays,
      startTime,
      endTime,
      room: room.trim() || undefined,
      faculty: faculty.trim() || undefined,
    };

    const validation = validateManualSchedule(candidate);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    onSave(candidate);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="manual-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        ref={modalRef}
        className="w-full max-w-md bg-surface border border-app-border rounded-card shadow-warm p-5 space-y-4 text-text-primary"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-app-border pb-3">
          <div>
            <h2 id="manual-modal-title" className="text-base font-bold text-text-primary">
              Enter {courseCode} Schedule
            </h2>
            <p className="text-xs text-text-muted mt-0.5">{courseTitle}</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cancel"
            className="p-1 rounded-btn hover:bg-subtle text-text-muted hover:text-text-primary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Section label */}
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1">
              Section Label <span className="text-red-500">*</span>
            </label>
            <input
              ref={sectionInputRef}
              type="text"
              maxLength={4}
              value={section}
              onChange={(e) => {
                setSection(e.target.value);
                if (errors.section) setErrors((prev) => ({ ...prev, section: '' }));
              }}
              placeholder="e.g. I, A, B"
              className={`w-full px-3 py-1.5 text-sm rounded-input border ${
                errors.section ? 'border-red-500 ring-1 ring-red-400' : 'border-app-border'
              } bg-page text-text-primary focus:outline-none focus:border-orange-500`}
            />
            {errors.section && (
              <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span>{errors.section}</span>
              </p>
            )}
          </div>

          {/* Meeting Days */}
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1">
              Class Days <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-1.5">
              {DAYS_LIST.map((day) => {
                const isSelected = selectedDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => {
                      toggleDay(day);
                      if (errors.days) setErrors((prev) => ({ ...prev, days: '' }));
                    }}
                    className={`flex-1 py-1.5 px-2 text-xs font-bold rounded border transition-colors ${
                      isSelected
                        ? 'bg-orange-500 text-white border-orange-600 shadow-2xs'
                        : 'bg-page border-app-border text-text-secondary hover:bg-subtle hover:text-text-primary'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
            {errors.days && (
              <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span>{errors.days}</span>
              </p>
            )}
          </div>

          {/* Quick-fill Lab Slot Preset */}
          {labSlots.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Quick-fill: UIU Standard Lab Slot
              </label>
              <select
                onChange={handleLabSlotSelect}
                defaultValue=""
                className="w-full px-2.5 py-1.5 text-xs rounded border border-app-border bg-page text-text-primary focus:outline-none focus:border-orange-500"
              >
                <option value="">Custom Time (or choose a slot)...</option>
                {labSlots.map((slot) => (
                  <option key={`${slot.start}-${slot.end}`} value={`${slot.start}-${slot.end}`}>
                    {slot.label} (Lab Slot)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Start and End Times */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">
                Start Time <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="time"
                  step="300"
                  value={startTime}
                  onChange={(e) => {
                    setStartTime(e.target.value);
                    if (errors.startTime || errors.endTime || errors.timeRange) {
                      setErrors((prev) => ({
                        ...prev,
                        startTime: '',
                        endTime: '',
                        timeRange: '',
                      }));
                    }
                  }}
                  className={`w-full px-2.5 py-1.5 text-xs rounded border ${
                    errors.startTime ? 'border-red-500' : 'border-app-border'
                  } bg-page text-text-primary focus:outline-none focus:border-orange-500`}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">
                End Time <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="time"
                  step="300"
                  value={endTime}
                  onChange={(e) => {
                    setEndTime(e.target.value);
                    if (errors.startTime || errors.endTime || errors.timeRange) {
                      setErrors((prev) => ({
                        ...prev,
                        startTime: '',
                        endTime: '',
                        timeRange: '',
                      }));
                    }
                  }}
                  className={`w-full px-2.5 py-1.5 text-xs rounded border ${
                    errors.endTime ? 'border-red-500' : 'border-app-border'
                  } bg-page text-text-primary focus:outline-none focus:border-orange-500`}
                />
              </div>
            </div>
          </div>

          {(errors.startTime || errors.endTime || errors.timeRange) && (
            <p className="text-[11px] text-red-600 flex items-center gap-1">
              <AlertCircle className="w-3 h-3 shrink-0" />
              <span>{errors.startTime || errors.endTime || errors.timeRange}</span>
            </p>
          )}

          {/* Optional Room & Faculty */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Room (Optional)
              </label>
              <input
                type="text"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                placeholder="e.g. 405"
                className="w-full px-2.5 py-1.5 text-xs rounded border border-app-border bg-page text-text-primary focus:outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Faculty (Optional)
              </label>
              <input
                type="text"
                value={faculty}
                onChange={(e) => setFaculty(e.target.value)}
                placeholder="e.g. TBA or Name"
                className="w-full px-2.5 py-1.5 text-xs rounded border border-app-border bg-page text-text-primary focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-app-border">
            <button
              type="button"
              onClick={onCancel}
              className="px-3.5 py-1.5 rounded-btn bg-surface hover:bg-subtle text-text-secondary font-medium border border-app-border text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-btn bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs shadow-2xs transition-colors flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save Schedule</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
