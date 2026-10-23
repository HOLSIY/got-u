import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, MapPin, DollarSign, Users, Clock, Check, Sparkles, Trophy, Cake, Coffee, Heart, Music, Plane, Briefcase, Film, Gamepad2, Pizza } from 'lucide-react';
import { EventType, User, EventDetails } from '../../types';
import { formatUsername } from '../../utils/constants';

interface CreateEventGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableUsers: User[];
  onCreateEventGroup: (name: string, eventDetails: EventDetails, members: User[]) => Promise<void>;
}

export const EVENT_TYPES: { type: EventType; icon: any; color: string; label: string }[] = [
  { type: 'Birthday', icon: Cake, color: 'text-pink-400', label: 'Birthday Party' },
  { type: 'Wedding', icon: Heart, color: 'text-rose-400', label: 'Wedding Celebration' },
  { type: 'Football Match', icon: Trophy, color: 'text-emerald-400', label: 'Football / Sports' },
  { type: 'Coffee', icon: Coffee, color: 'text-amber-400', label: 'Coffee Catchup' },
  { type: 'Study Group', icon: Users, color: 'text-indigo-400', label: 'Study Session' },
  { type: 'Trip', icon: Plane, color: 'text-sky-400', label: 'Trip & Vacation' },
  { type: 'Business Meeting', icon: Briefcase, color: 'text-blue-400', label: 'Business Meeting' },
  { type: 'Family Gathering', icon: Users, color: 'text-orange-400', label: 'Family Reunion' },
  { type: 'Movie Night', icon: Film, color: 'text-purple-400', label: 'Movie Night' },
  { type: 'Gaming Session', icon: Gamepad2, color: 'text-green-400', label: 'Gaming Session' },
  { type: 'Party', icon: Music, color: 'text-yellow-400', label: 'Party' },
  { type: 'Picnic', icon: Pizza, color: 'text-teal-400', label: 'Picnic' },
  { type: 'Custom Event', icon: Sparkles, color: 'text-violet-400', label: 'Custom Event' },
];

export const CreateEventGroupModal: React.FC<CreateEventGroupModalProps> = ({
  isOpen,
  onClose,
  availableUsers,
  onCreateEventGroup,
}) => {
  const [selectedType, setSelectedType] = useState<EventType>('Trip');
  const [groupName, setGroupName] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [locationName, setLocationName] = useState('');
  const [budgetTotal, setBudgetTotal] = useState('');
  const [whoPaysWhat, setWhoPaysWhat] = useState('Equal Split');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const toggleUserSelect = (uid: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const handleCreate = async () => {
    if (!groupName.trim() || !date) {
      alert('Please provide a group name and event date.');
      return;
    }
    setSubmitting(true);
    try {
      const selectedMembers = availableUsers.filter((u) => selectedUserIds.includes(u.id));
      const eventDetails: EventDetails = {
        eventType: selectedType,
        title: groupName,
        date,
        time: time || '12:00',
        locationName: locationName || 'To Be Decided',
        budgetTotal: budgetTotal ? parseFloat(budgetTotal) : 0,
        whoPaysWhat: whoPaysWhat || 'Equal Split',
        rsvp: {},
        polls: [],
        tasks: [],
        expenses: [],
        announcements: [`Welcome to ${groupName}! Get ready for an amazing event.`],
        checklist: [
          { id: '1', text: 'Confirm Attendance (RSVP)', done: false },
          { id: '2', text: 'Discuss Transportation', done: false },
        ],
      };

      await onCreateEventGroup(groupName, eventDetails, selectedMembers);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/90 sticky top-0 z-10">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-400" />
              <h3 className="text-base font-semibold text-white">Create Intelligent Event Group</h3>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Body */}
          <div className="p-4 overflow-y-auto space-y-4 flex-1">
            {/* Event Type Selection */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-neutral-300">Select Event Type</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto p-1">
                {EVENT_TYPES.map((item) => {
                  const Icon = item.icon;
                  const isSelected = selectedType === item.type;
                  return (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => {
                        setSelectedType(item.type);
                        if (!groupName) setGroupName(`${item.label} Group`);
                      }}
                      className={`p-2.5 rounded-xl border flex items-center gap-2 text-left text-xs transition-all ${
                        isSelected
                          ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md'
                          : 'bg-neutral-950 border-neutral-800/80 text-neutral-400 hover:text-white hover:bg-neutral-800'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${item.color}`} />
                      <span className="truncate font-medium">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Event Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-300">Group Name</label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="e.g. Summer Beach Trip 2026"
                className="w-full p-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" /> Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full p-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" /> Time
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full p-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none"
                />
              </div>
            </div>

            {/* Location */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-rose-400" /> Location / Google Maps Place
              </label>
              <input
                type="text"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="e.g. Grand Resort Hotel, Paris"
                className="w-full p-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Budget & Who Pays What */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Estimated Budget ($)
                </label>
                <input
                  type="number"
                  value={budgetTotal}
                  onChange={(e) => setBudgetTotal(e.target.value)}
                  placeholder="500"
                  className="w-full p-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300">Who Pays What</label>
                <select
                  value={whoPaysWhat}
                  onChange={(e) => setWhoPaysWhat(e.target.value)}
                  className="w-full p-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none"
                >
                  <option value="Equal Split">Equal Split</option>
                  <option value="Host Pays All">Host Pays All</option>
                  <option value="Pay For Yourself">Pay For Yourself</option>
                  <option value="Custom Split">Custom Expense Split</option>
                </select>
              </div>
            </div>

            {/* Select Members */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-sky-400" /> Invite Friends ({selectedUserIds.length})
              </label>
              <div className="space-y-1 max-h-36 overflow-y-auto p-1 bg-neutral-950 rounded-xl border border-neutral-800">
                {availableUsers.map((u) => {
                  const isSelected = selectedUserIds.includes(u.id);
                  return (
                    <div
                      key={u.id}
                      onClick={() => toggleUserSelect(u.id)}
                      className={`p-2 rounded-xl flex items-center justify-between cursor-pointer transition-colors ${
                        isSelected ? 'bg-indigo-600/20 text-white' : 'hover:bg-neutral-800/60 text-neutral-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <img src={u.avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover" />
                        <div>
                          <p className="text-xs font-medium">{u.fullName}</p>
                          <p className="text-[10px] text-neutral-500">{formatUsername(u.username)}</p>
                        </div>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                          isSelected ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-neutral-700'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-neutral-800 flex justify-end gap-2 bg-neutral-950 sticky bottom-0">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-neutral-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={submitting}
              className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-95 text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-500/20 flex items-center gap-1.5 transition-all"
            >
              <Calendar className="w-4 h-4" /> Create Event Group
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
