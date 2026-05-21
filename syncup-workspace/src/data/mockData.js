export const users = [
  { id: 1, name: 'Sarah Chen', status: 'online', avatar: 'SC', color: 'from-blue-500 to-cyan-500' },
  { id: 2, name: 'Mike Rodriguez', status: 'online', avatar: 'MR', color: 'from-purple-500 to-pink-500' },
  { id: 3, name: 'James Park', status: 'online', avatar: 'JP', color: 'from-green-500 to-emerald-500' },
  { id: 4, name: 'Emma Wilson', status: 'away', avatar: 'EW', color: 'from-orange-500 to-red-500' },
  { id: 5, name: 'Alex Turner', status: 'away', avatar: 'AT', color: 'from-indigo-500 to-purple-500' },
  { id: 6, name: 'John Doe', status: 'online', avatar: 'JD', color: 'from-pink-500 to-rose-500' }, // Current user
];

export const channels = [
  { id: 1, name: 'general', private: false, unread: 0, memberCount: 24 },
  { id: 2, name: 'random', private: false, unread: 3, memberCount: 18 },
  { id: 3, name: 'project-alpha', private: true, unread: 7, memberCount: 12 },
  { id: 4, name: 'engineering', private: false, unread: 0, memberCount: 32 },
  { id: 5, name: 'design-team', private: true, unread: 2, memberCount: 8 },
];

export const messages = {
  channel: {
    1: [
      { id: 1, userId: 1, text: 'Hey team! Just finished the wireframes for the new dashboard. Take a look!', time: '09:23 AM', reactions: { '👍': 3, '❤️': 1 } },
      { id: 2, userId: 2, text: 'Looking great! Love the minimalist approach.', time: '09:25 AM', reactions: { '👍': 5, '😂': 2 } },
    ],
    2: [
        { id: 1, userId: 3, text: 'Anyone seen the new Thor movie?', time: '10:15 AM', reactions: { '👀': 1 } },
    ],
    3: [
        { id: 1, userId: 4, text: 'Project Alpha deadline is approaching. Let\'s sync up at 3 PM.', time: '11:00 AM', reactions: { '✅': 2 } },
    ],
    4: [],
    5: [
        { id: 1, userId: 5, text: 'Here are the latest design mockups.', time: '02:45 PM', reactions: { '🎨': 4 } },
    ]
  },
  dm: {
    1: [
        { id: 1, userId: 1, text: 'Hey John, got a minute?', time: '01:30 PM', reactions: {} },
        { id: 2, userId: 6, text: 'Sure, what\'s up?', time: '01:31 PM', reactions: {} },
    ],
    2: [
        { id: 1, userId: 2, text: 'Can you review my PR for the auth service?', time: 'Yesterday', reactions: { '🙏': 1 } },
    ],
    3: [],
    4: [],
    5: []
  }
};
