import React, { useState } from 'react';
import { X, Search } from 'lucide-react';

const CreateDirectMessageModal = ({ isOpen, onClose, users, onSelectUser }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (user) => {
    onSelectUser(user);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6 z-50 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700 flex flex-col animate-in zoom-in-95 duration-200 max-h-[80vh]">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Start a new message</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center transition-colors">
            <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
        </div>
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-slate-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search for a user..."
              className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          <div className="space-y-1">
            {filteredUsers.map(user => (
              <button 
                key={user.id} 
                onClick={() => handleSelect(user)}
                className="w-full flex items-center gap-3 p-3 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-left"
              >
                <div className="relative">
                  <div className={`w-9 h-9 bg-gradient-to-br ${user.color} rounded-lg flex items-center justify-center text-white font-bold text-sm overflow-hidden`}>
                    {typeof user.avatar === 'string' && /^(https?:)?\/\//i.test(user.avatar) ? (
                      <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      user.avatar
                    )}
                  </div>
                  <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 ${user.status === 'online' ? 'bg-green-500' : 'bg-yellow-500'} border-2 border-white dark:border-slate-800 rounded-full`}></div>
                </div>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{user.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateDirectMessageModal;
