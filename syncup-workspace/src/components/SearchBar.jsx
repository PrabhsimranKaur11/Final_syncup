import React, { useState, useEffect, useRef } from 'react';
import { userAPI, channelAPI } from '../services/api';
import { Search, Loader, Hash, MessageSquare } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { getChannelDisplayName } from '../utils/channelDisplay';

const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
};

const SearchBar = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ channels: [], users: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const debouncedQuery = useDebounce(query, 300);
  const navigate = useNavigate();
  const { workspaceId } = useParams();
  const { currentUser } = useTheme();
  const searchRef = useRef(null);

  const wsId = workspaceId || '1';

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults({ channels: [], users: [] });
      return;
    }

    setIsLoading(true);
    const q = debouncedQuery.toLowerCase();

    Promise.allSettled([
      userAPI.search(debouncedQuery),
      channelAPI.getAll(wsId),
    ]).then(([usersRes, channelsRes]) => {
      const users = usersRes.status === 'fulfilled' && Array.isArray(usersRes.value)
        ? usersRes.value
        : [];

      const allChannels = channelsRes.status === 'fulfilled' && Array.isArray(channelsRes.value)
        ? channelsRes.value
        : [];

      const channels = allChannels.filter(c =>
        c.name?.toLowerCase().includes(q)
      );

      setResults({ users, channels });
      setIsLoading(false);
    });
  }, [debouncedQuery, wsId]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleResultClick = (path) => {
    navigate(path);
    setIsOpen(false);
    setQuery('');
  };

  const hasResults = results.channels.length > 0 || results.users.length > 0;

  return (
    <div className="relative w-full max-w-xs" ref={searchRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          className="w-full bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {isOpen && (
        <div className="absolute top-full mt-2 w-full bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 z-10 max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center p-4">
              <Loader className="w-6 h-6 text-blue-500 animate-spin" />
            </div>
          ) : hasResults ? (
            <div>
              {results.channels.length > 0 && (
                <div className="p-2">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase px-2 mb-1">Channels</h3>
                  <ul>
                    {results.channels.map(channel => (
                      <li
                        key={`ch-${channel._id || channel.id}`}
                        onClick={() => handleResultClick(`/dashboard/${wsId}/channel/${channel._id || channel.id}`)}
                        className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                      >
                        <Hash className="w-4 h-4 text-slate-500" />
                        <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{getChannelDisplayName(channel, currentUser?._id)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {results.users.length > 0 && (
                <div className="p-2">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase px-2 mb-1">Users</h3>
                  <ul>
                    {results.users.map(user => (
                      <li
                        key={`usr-${user._id}`}
                        onClick={() => handleResultClick(`/dashboard/${wsId}/dm/${user._id}`)}
                        className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                      >
                        <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold text-[10px] overflow-hidden">
                          {typeof user.avatar === 'string' && /^(https?:)?\/\//i.test(user.avatar) ? (
                            <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover rounded-full" />
                          ) : (
                            user.avatar || (user.fullName?.[0] || user.email?.[0] || 'U').toUpperCase()
                          )}
                        </div>
                        <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                          {user.fullName || user.email}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            query && <p className="p-4 text-sm text-slate-500">No results found for "{query}"</p>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;