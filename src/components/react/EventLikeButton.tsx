import React, { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { toggleEventLike, checkEventHasLiked } from '../../lib/firebaseUtils';
import { useAuth } from '../../hooks/useAuth';

interface EventLikeButtonProps {
  eventId: string;
  initialLikeCount: number;
}

export const EventLikeButton: React.FC<EventLikeButtonProps> = ({ eventId, initialLikeCount }) => {
  const { currentUser } = useAuth();
  const [hasLiked, setHasLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkLikeStatus = async () => {
      if (currentUser) {
        const liked = await checkEventHasLiked(eventId, currentUser.uid);
        setHasLiked(liked);
      }
      setLoading(false);
    };
    checkLikeStatus();
  }, [eventId, currentUser]);

  const handleLike = async () => {
    if (!currentUser || loading) return;

    const newLikedState = !hasLiked;
    setHasLiked(newLikedState);
    setLikeCount(prev => newLikedState ? prev + 1 : prev - 1);

    try {
      await toggleEventLike(eventId, currentUser.uid, newLikedState);
    } catch (error) {
      console.error("Failed to toggle like", error);
      // Revert optimistic update
      setHasLiked(!newLikedState);
      setLikeCount(prev => !newLikedState ? prev + 1 : prev - 1);
    }
  };

  if (!currentUser) {
    return (
      <button className="flex items-center space-x-1 text-gray-500 hover:text-pink-500 transition-colors" disabled>
        <Heart size={20} />
        <span>{likeCount}</span>
      </button>
    );
  }

  return (
    <button 
      onClick={handleLike}
      disabled={loading}
      className={`flex items-center space-x-1 transition-colors ${
        hasLiked ? 'text-pink-500' : 'text-gray-500 hover:text-pink-500'
      }`}
    >
      <Heart size={20} fill={hasLiked ? 'currentColor' : 'none'} />
      <span>{likeCount}</span>
    </button>
  );
};
