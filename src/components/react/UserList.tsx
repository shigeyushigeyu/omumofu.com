import React, { useState, useEffect } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { UserProfile } from '../../types/schema';

export const UserList: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        // searchable なユーザーのみ取得
        const q = query(
          collection(db, 'users'),
          where('privacySettings.searchable', '==', true)
        );
        const snapshot = await getDocs(q);
        const fetchedUsers = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            uid: doc.id,
            ...data
          } as UserProfile;
        });
        setUsers(fetchedUsers);
      } catch (err) {
        console.error("Error fetching users:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUsers();
  }, []);

  const filteredUsers = users.filter(user => {
    const matchName = user.displayName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchTags = user.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchName || matchTags;
  });

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8 relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="名前やタグで検索..."
          className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-300 focus:border-blue-300 outline-none shadow-sm transition-all text-lg"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-blue-500 w-8 h-8" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers.map(user => (
            <div key={user.uid} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-16 h-16 rounded-full bg-gray-100 overflow-hidden flex-shrink-0">
                  {user.profileImageUrl ? (
                    <img src={user.profileImageUrl} alt={user.displayName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">No Img</div>
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 text-lg">{user.displayName}</h3>
                  <a href={`/user/${user.uid}`} className="text-blue-500 hover:underline text-sm font-medium">プロフィールを見る</a>
                </div>
              </div>
              <p className="text-gray-600 text-sm line-clamp-2 mb-4 h-10">{user.bio}</p>
              <div className="flex flex-wrap gap-2">
                {user.tags?.map(tag => (
                  <span key={tag} className="px-2 py-1 bg-blue-50 text-blue-600 rounded-md text-xs font-medium">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
          {filteredUsers.length === 0 && !loading && (
            <div className="col-span-full text-center py-12 text-gray-500">
              見つかりませんでした。
            </div>
          )}
        </div>
      )}
    </div>
  );
};
