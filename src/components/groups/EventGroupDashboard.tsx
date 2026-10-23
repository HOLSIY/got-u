import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar,
  Clock,
  MapPin,
  DollarSign,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Vote,
  ListTodo,
  Megaphone,
  Image as ImageIcon,
  Plus,
  Share2,
  ExternalLink,
  CloudSun,
  Users,
  CheckSquare,
  Sparkles,
  Trophy,
  X,
  Lock
} from 'lucide-react';
import { Chat, EventDetails, User, Message } from '../../types';
import { formatUsername } from '../../utils/constants';

interface EventGroupDashboardProps {
  chat: Chat;
  messages: Message[];
  currentUser: User;
  isOpen: boolean;
  onClose: () => void;
  onUpdateEventDetails: (updated: EventDetails) => Promise<void>;
}

export const EventGroupDashboard: React.FC<EventGroupDashboardProps> = ({
  chat,
  messages,
  currentUser,
  isOpen,
  onClose,
  onUpdateEventDetails,
}) => {
  const event = chat.eventDetails;
  const [activeTab, setActiveTab] = useState<'overview' | 'rsvp' | 'budget' | 'polls' | 'tasks' | 'gallery' | 'album'>('overview');

  // Countdown timer calculations
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; mins: number; secs: number } | null>(null);
  const [isEventPast, setIsEventPast] = useState(false);

  // New item inputs
  const [newAnnouncement, setNewAnnouncement] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newExpenseTitle, setNewExpenseTitle] = useState('');
  const [newExpenseAmount, setNewExpenseAmount] = useState('');
  const [newPollQuestion, setNewPollQuestion] = useState('');
  const [newPollOptions, setNewPollOptions] = useState(['Option 1', 'Option 2']);

  useEffect(() => {
    if (!event?.date) return;

    const calculateTimer = () => {
      const eventTime = new Date(`${event.date}T${event.time || '12:00'}`).getTime();
      const now = new Date().getTime();
      const diff = eventTime - now;

      if (diff <= 0) {
        setIsEventPast(true);
        setTimeLeft({ days: 0, hours: 0, mins: 0, secs: 0 });
      } else {
        setIsEventPast(false);
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft({ days, hours, mins, secs });
      }
    };

    calculateTimer();
    const interval = setInterval(calculateTimer, 1000);
    return () => clearInterval(interval);
  }, [event?.date, event?.time]);

  if (!isOpen || !event) return null;

  // RSVP Action
  const handleRsvp = async (status: 'going' | 'maybe' | 'declined') => {
    const updatedRsvp = { ...(event.rsvp || {}), [currentUser.id]: status };
    await onUpdateEventDetails({ ...event, rsvp: updatedRsvp });
  };

  // Add Task
  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;
    const newTask = {
      id: Date.now().toString(),
      title: newTaskTitle.trim(),
      isCompleted: false,
    };
    const updatedTasks = [...(event.tasks || []), newTask];
    await onUpdateEventDetails({ ...event, tasks: updatedTasks });
    setNewTaskTitle('');
  };

  // Toggle Task
  const handleToggleTask = async (taskId: string) => {
    const updatedTasks = (event.tasks || []).map((t) =>
      t.id === taskId ? { ...t, isCompleted: !t.isCompleted } : t
    );
    await onUpdateEventDetails({ ...event, tasks: updatedTasks });
  };

  // Add Expense
  const handleAddExpense = async () => {
    if (!newExpenseTitle.trim() || !newExpenseAmount) return;
    const expense = {
      id: Date.now().toString(),
      title: newExpenseTitle.trim(),
      amount: parseFloat(newExpenseAmount),
      paidByUserId: currentUser.id,
      paidByUserName: currentUser.fullName,
      splitWithUserIds: chat.members.map((m) => m.id),
      createdAt: Date.now(),
    };
    const updatedExpenses = [...(event.expenses || []), expense];
    await onUpdateEventDetails({ ...event, expenses: updatedExpenses });
    setNewExpenseTitle('');
    setNewExpenseAmount('');
  };

  // Add Poll
  const handleAddPoll = async () => {
    if (!newPollQuestion.trim()) return;
    const poll = {
      id: Date.now().toString(),
      question: newPollQuestion.trim(),
      options: newPollOptions.map((opt, i) => ({ id: i.toString(), text: opt, votedUserIds: [] })),
      createdBy: currentUser.fullName,
      createdAt: Date.now(),
    };
    const updatedPolls = [...(event.polls || []), poll];
    await onUpdateEventDetails({ ...event, polls: updatedPolls });
    setNewPollQuestion('');
  };

  // Vote on Poll
  const handleVotePoll = async (pollId: string, optionId: string) => {
    if (!currentUser?.id) return;
    const currentUid = currentUser.id;
    const updatedPolls = (event.polls || []).map((p) => {
      if (p.id !== pollId) return p;
      const newOptions = p.options.map((opt) => {
        const hasVoted = opt.votedUserIds.includes(currentUid);
        if (opt.id === optionId) {
          return {
            ...opt,
            votedUserIds: hasVoted
              ? opt.votedUserIds.filter((id) => id !== currentUid)
              : [...opt.votedUserIds, currentUid],
          };
        }
        return {
          ...opt,
          votedUserIds: opt.votedUserIds.filter((id) => id !== currentUid),
        };
      });
      return { ...p, options: newOptions };
    });
    await onUpdateEventDetails({ ...event, polls: updatedPolls });
  };

  // Post Announcement
  const handlePostAnnouncement = async () => {
    if (!newAnnouncement.trim()) return;
    const updatedAnnouncements = [newAnnouncement.trim(), ...(event.announcements || [])];
    await onUpdateEventDetails({ ...event, announcements: updatedAnnouncements });
    setNewAnnouncement('');
  };

  // Calculate RSVP counts
  const rsvpEntries = Object.entries(event.rsvp || {});
  const goingCount = rsvpEntries.filter(([_, v]) => v === 'going').length;
  const maybeCount = rsvpEntries.filter(([_, v]) => v === 'maybe').length;
  const declinedCount = rsvpEntries.filter(([_, v]) => v === 'declined').length;
  const myRsvp = currentUser?.id ? event.rsvp?.[currentUser.id] : undefined;

  // Total expenses spent
  const totalSpent = (event.expenses || []).reduce((sum, e) => sum + e.amount, 0);

  // Extract photos/media from chat history for gallery
  const mediaMessages = messages.filter((m) => m.type === 'image' || m.type === 'video' || (m.mediaUrls && m.mediaUrls.length > 0));

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.locationName)}`;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col h-[90vh]"
        >
          {/* Header Banner */}
          <div className="relative p-5 bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 border-b border-neutral-800 flex flex-col justify-between overflow-hidden shrink-0">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 bg-white/10 backdrop-blur-md rounded-full text-[11px] font-bold text-indigo-200 border border-white/10 uppercase tracking-wider">
                  {event.eventType} Event
                </span>
                {isEventPast && (
                  <span className="px-2.5 py-1 bg-amber-500/20 backdrop-blur-md rounded-full text-[11px] font-bold text-amber-300 border border-amber-500/30 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Memory Album
                  </span>
                )}
              </div>

              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-3 z-10">
              <h2 className="text-xl font-bold text-white">{event.title}</h2>
              <div className="flex flex-wrap items-center gap-4 text-xs text-indigo-200/80 mt-1">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" /> {event.date} at {event.time}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-rose-400" /> {event.locationName}
                </span>
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-300 hover:underline flex items-center gap-1 text-[11px]"
                >
                  <ExternalLink className="w-3 h-3" /> Google Maps
                </a>
              </div>
            </div>

            {/* Countdown Box */}
            <div className="mt-4 p-3 bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-semibold text-white">
                  {isEventPast ? 'Event Completed' : 'Countdown to Event'}
                </span>
              </div>

              {timeLeft && !isEventPast && (
                <div className="flex items-center gap-3 text-white font-mono text-xs font-bold">
                  <div className="text-center">
                    <span className="text-sm">{timeLeft.days}</span>
                    <span className="text-[9px] block text-neutral-400 font-sans">DAYS</span>
                  </div>
                  <span>:</span>
                  <div className="text-center">
                    <span className="text-sm">{timeLeft.hours}</span>
                    <span className="text-[9px] block text-neutral-400 font-sans">HRS</span>
                  </div>
                  <span>:</span>
                  <div className="text-center">
                    <span className="text-sm">{timeLeft.mins}</span>
                    <span className="text-[9px] block text-neutral-400 font-sans">MINS</span>
                  </div>
                  <span>:</span>
                  <div className="text-center">
                    <span className="text-sm">{timeLeft.secs}</span>
                    <span className="text-[9px] block text-neutral-400 font-sans">SECS</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 p-2 bg-neutral-950 border-b border-neutral-800 overflow-x-auto no-scrollbar shrink-0">
            {[
              { id: 'overview', label: 'Overview', icon: Calendar },
              { id: 'rsvp', label: `RSVP (${goingCount})`, icon: Users },
              { id: 'budget', label: 'Expenses & Split', icon: DollarSign },
              { id: 'polls', label: 'Polls & Votes', icon: Vote },
              { id: 'tasks', label: 'Tasks & Checklist', icon: CheckSquare },
              { id: 'gallery', label: 'Photo Gallery', icon: ImageIcon },
              ...(isEventPast ? [{ id: 'album', label: 'Memory Album', icon: Sparkles }] : []),
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab Body */}
          <div className="p-4 overflow-y-auto flex-1 space-y-4">
            {/* Tab 1: Overview */}
            {activeTab === 'overview' && (
              <div className="space-y-4">
                {/* Weather & Location Card */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 bg-neutral-950 border border-neutral-800 rounded-2xl flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider">Live Weather Info</span>
                      <p className="text-sm font-semibold text-white mt-0.5">24°C Sunny & Clear</p>
                      <p className="text-[11px] text-neutral-400">Perfect weather for {event.locationName}</p>
                    </div>
                    <CloudSun className="w-8 h-8 text-amber-400" />
                  </div>

                  <div className="p-3.5 bg-neutral-950 border border-neutral-800 rounded-2xl flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider">Who Pays What</span>
                      <p className="text-sm font-semibold text-emerald-400 mt-0.5">{event.whoPaysWhat}</p>
                      <p className="text-[11px] text-neutral-400">Budget: ${event.budgetTotal || 0}</p>
                    </div>
                    <DollarSign className="w-8 h-8 text-emerald-400" />
                  </div>
                </div>

                {/* My RSVP Quick Buttons */}
                <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-2xl space-y-2">
                  <label className="text-xs font-semibold text-neutral-300">My Attendance Status</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { status: 'going', label: 'Going', icon: CheckCircle2, color: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10' },
                      { status: 'maybe', label: 'Maybe', icon: HelpCircle, color: 'text-amber-400 border-amber-500/40 bg-amber-500/10' },
                      { status: 'declined', label: 'Declined', icon: XCircle, color: 'text-rose-400 border-rose-500/40 bg-rose-500/10' },
                    ].map((btn) => {
                      const isSelected = myRsvp === btn.status;
                      const Icon = btn.icon;
                      return (
                        <button
                          key={btn.status}
                          onClick={() => handleRsvp(btn.status as any)}
                          className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                            isSelected ? btn.color : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                          }`}
                        >
                          <Icon className="w-4 h-4" /> {btn.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Announcements Section */}
                <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <Megaphone className="w-4 h-4 text-amber-400" /> Pinned Announcements
                    </h4>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newAnnouncement}
                      onChange={(e) => setNewAnnouncement(e.target.value)}
                      placeholder="Post an announcement for the group..."
                      className="flex-1 p-2 bg-neutral-900 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none"
                    />
                    <button
                      onClick={handlePostAnnouncement}
                      className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl"
                    >
                      Post
                    </button>
                  </div>

                  <div className="space-y-2 max-h-36 overflow-y-auto">
                    {(event.announcements || []).map((ann, idx) => (
                      <div key={idx} className="p-2.5 bg-neutral-900/80 rounded-xl border border-neutral-800 text-xs text-neutral-200">
                        📌 {ann}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: RSVP */}
            {activeTab === 'rsvp' && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                    <span className="text-2xl font-bold text-emerald-400">{goingCount}</span>
                    <span className="block text-[10px] text-neutral-400">Going</span>
                  </div>
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
                    <span className="text-2xl font-bold text-amber-400">{maybeCount}</span>
                    <span className="block text-[10px] text-neutral-400">Maybe</span>
                  </div>
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl">
                    <span className="text-2xl font-bold text-rose-400">{declinedCount}</span>
                    <span className="block text-[10px] text-neutral-400">Declined</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-neutral-300">Group Attendance List</label>
                  <div className="space-y-1.5 max-h-60 overflow-y-auto">
                    {chat.members.map((m) => {
                      const status = event.rsvp?.[m.id] || 'pending';
                      const badgeColors: Record<string, string> = {
                        going: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
                        maybe: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
                        declined: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
                        pending: 'bg-neutral-800 text-neutral-400 border-neutral-700',
                      };
                      return (
                        <div key={m.id} className="p-2.5 bg-neutral-950 rounded-xl border border-neutral-800 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <img src={m.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                            <div>
                              <p className="text-xs font-semibold text-white">{m.fullName}</p>
                              <p className="text-[10px] text-neutral-500">{formatUsername(m.username)}</p>
                            </div>
                          </div>
                          <span className={`text-[10px] px-2.5 py-0.5 rounded-full border uppercase font-bold ${badgeColors[status]}`}>
                            {status}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Expenses & Budget */}
            {activeTab === 'budget' && (
              <div className="space-y-4">
                <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-xs text-neutral-400 font-semibold">Total Expenses Recorded</span>
                    <p className="text-2xl font-bold text-emerald-400">${totalSpent.toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-neutral-400">Target Budget</span>
                    <p className="text-sm font-semibold text-white">${event.budgetTotal || 0}</p>
                  </div>
                </div>

                {/* Add Expense Form */}
                <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-2xl space-y-2">
                  <label className="text-xs font-semibold text-neutral-300">Record Expense</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={newExpenseTitle}
                      onChange={(e) => setNewExpenseTitle(e.target.value)}
                      placeholder="Title (e.g. Hotel / Dinner)"
                      className="p-2 bg-neutral-900 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none"
                    />
                    <input
                      type="number"
                      value={newExpenseAmount}
                      onChange={(e) => setNewExpenseAmount(e.target.value)}
                      placeholder="Amount ($)"
                      className="p-2 bg-neutral-900 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none"
                    />
                    <button
                      onClick={handleAddExpense}
                      className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1"
                    >
                      <Plus className="w-4 h-4" /> Add Expense
                    </button>
                  </div>
                </div>

                {/* Expense List */}
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {(event.expenses || []).map((exp) => (
                    <div key={exp.id} className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-semibold text-white">{exp.title}</p>
                        <p className="text-[10px] text-neutral-400">Paid by {exp.paidByUserName}</p>
                      </div>
                      <span className="font-bold text-emerald-400 text-sm">${exp.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab 4: Polls */}
            {activeTab === 'polls' && (
              <div className="space-y-4">
                {/* Create Poll */}
                <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-2xl space-y-2">
                  <label className="text-xs font-semibold text-neutral-300">Create Group Poll</label>
                  <input
                    type="text"
                    value={newPollQuestion}
                    onChange={(e) => setNewPollQuestion(e.target.value)}
                    placeholder="Ask a question (e.g. Which hotel should we book?)"
                    className="w-full p-2 bg-neutral-900 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none"
                  />
                  <button
                    onClick={handleAddPoll}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl"
                  >
                    Create Poll
                  </button>
                </div>

                {/* Polls List */}
                <div className="space-y-3">
                  {(event.polls || []).map((poll) => (
                    <div key={poll.id} className="p-4 bg-neutral-950 rounded-2xl border border-neutral-800 space-y-3 text-xs">
                      <h5 className="font-semibold text-white flex items-center gap-1.5">
                        <Vote className="w-4 h-4 text-indigo-400" /> {poll.question}
                      </h5>
                      <div className="space-y-2">
                        {poll.options.map((opt) => {
                          const hasVoted = Boolean(currentUser?.id && opt.votedUserIds.includes(currentUser.id));
                          return (
                            <button
                              key={opt.id}
                              onClick={() => handleVotePoll(poll.id, opt.id)}
                              className={`w-full p-2.5 rounded-xl border flex items-center justify-between transition-colors ${
                                hasVoted ? 'bg-indigo-600/20 border-indigo-500 text-white' : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:bg-neutral-800'
                              }`}
                            >
                              <span>{opt.text}</span>
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-neutral-800">
                                {opt.votedUserIds.length} votes
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab 5: Tasks */}
            {activeTab === 'tasks' && (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="Add a task / checklist item..."
                    className="flex-1 p-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none"
                  />
                  <button
                    onClick={handleAddTask}
                    className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs rounded-xl"
                  >
                    Add Task
                  </button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {(event.tasks || []).map((task) => (
                    <div
                      key={task.id}
                      onClick={() => handleToggleTask(task.id)}
                      className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-colors text-xs ${
                        task.isCompleted ? 'bg-neutral-950/50 border-neutral-800/50 text-neutral-500 line-through' : 'bg-neutral-950 border-neutral-800 text-white'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center ${task.isCompleted ? 'bg-emerald-600 border-emerald-500 text-white' : 'border-neutral-700'}`}>
                        {task.isCompleted && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </div>
                      <span className="font-medium">{task.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab 6: Photo Gallery */}
            {activeTab === 'gallery' && (
              <div className="space-y-4">
                <h4 className="text-xs font-semibold text-neutral-300">Shared Event Photos & Media ({mediaMessages.length})</h4>
                {mediaMessages.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {mediaMessages.map((m) => (
                      <div key={m.id} className="aspect-square bg-neutral-950 rounded-2xl overflow-hidden border border-neutral-800 relative group">
                        {m.type === 'image' && <img src={m.mediaUrls?.[0] || m.fileUrl} alt="" className="w-full h-full object-cover" />}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity p-2 flex items-end">
                          <span className="text-[10px] text-white font-medium">{m.senderName}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-xs text-neutral-500">
                    No event media uploaded yet. Share photos in chat to build your event gallery!
                  </div>
                )}
              </div>
            )}

            {/* Tab 7: Memory Album */}
            {activeTab === 'album' && (
              <div className="space-y-4">
                <div className="p-4 bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-indigo-500/10 border border-amber-500/20 rounded-2xl space-y-2">
                  <h4 className="text-sm font-bold text-amber-300 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" /> Permanent Event Memory Album
                  </h4>
                  <p className="text-xs text-neutral-300 leading-relaxed">
                    This event has concluded! got u has preserved all photos, videos, voice notes, expense summaries, and discussions forever into a searchable memory album.
                  </p>
                </div>

                <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-2xl space-y-2 text-xs">
                  <span className="text-neutral-400 font-semibold">Event Highlights</span>
                  <ul className="space-y-1 text-neutral-300">
                    <li>🎉 Attended by {goingCount} friends</li>
                    <li>💰 Total budget spent: ${totalSpent.toFixed(2)}</li>
                    <li>📸 {mediaMessages.length} photos and videos saved</li>
                    <li>📍 Held at {event.locationName}</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
