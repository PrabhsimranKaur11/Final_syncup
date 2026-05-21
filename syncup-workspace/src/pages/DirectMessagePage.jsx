import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, Paperclip, Smile, ArrowLeft } from 'lucide-react';

// Mock data, in a real app this would come from an API
const mockUsers = {
  1: { name: 'Alice', online: true, avatar: 'https://i.pravatar.cc/40?u=alice' },
  2: { name: 'Bob', online: false, avatar: 'https://i.pravatar.cc/40?u=bob' },
  3: { name: 'Charlie', online: true, avatar: 'https://i.pravatar.cc/40?u=charlie' },
};

// Mock initial messages
const initialMessages = {
  1: [
    { id: 1, text: 'Hey, how are you?', sender: 'self' },
    { id: 2, text: 'I am good, thanks! How about you?', sender: 'other' },
  ],
  2: [
    { id: 1, text: 'Can you check the latest design file?', sender: 'other' },
  ],
  3: [],
};

const DirectMessagePage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    // Fetch user and messages based on userId
    setUser(mockUsers[userId]);
    setMessages(initialMessages[userId] || []);
  }, [userId]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (newMessage.trim() === '') return;

    const msg = {
      id: messages.length + 1,
      text: newMessage,
      sender: 'self',
    };

    // This is where you would emit a socket event in a real-time app
    console.log('Sending DM:', msg);
    setMessages([...messages, msg]);
    setNewMessage('');
  };

  if (!user) {
    return <div className="flex-1 flex items-center justify-center text-slate-400">Loading...</div>;
  }

  return (
    <div className="flex flex-col h-full flex-1 bg-white dark:bg-slate-800">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/dashboard/1')} className="md:hidden p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">
            <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
          </button>
          <div className="relative">
            <img className="w-10 h-10 rounded-full" src={user.avatar} alt={user.name} />
            <span className={`absolute bottom-0 right-0 block h-3 w-3 rounded-full ${user.online ? 'bg-green-500' : 'bg-slate-500'} border-2 border-white dark:border-slate-800`}></span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">{user.name}</h2>
        </div>
      </header>

      {/* Chat Window */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-4">
          {messages.map(msg => (
            <div key={msg.id} className={`flex items-end gap-2 ${msg.sender === 'self' ? 'justify-end' : ''}`}>
              {msg.sender === 'other' && <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full" />}
              <div className={`px-4 py-2 rounded-2xl max-w-sm lg:max-w-md ${msg.sender === 'self' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-none'}`}>
                {msg.text}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-700">
        <form onSubmit={handleSendMessage} className="relative">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={`Message ${user.name}`}
            className="w-full bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white pl-4 pr-24 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <button type="button" className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600">
              <Paperclip className="w-5 h-5 text-slate-500 dark:text-slate-400" />
            </button>
            <button type="button" className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600">
              <Smile className="w-5 h-5 text-slate-500 dark:text-slate-400" />
            </button>
            <button type="submit" className="p-2 rounded-full bg-blue-600 text-white hover:bg-blue-700">
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DirectMessagePage;
