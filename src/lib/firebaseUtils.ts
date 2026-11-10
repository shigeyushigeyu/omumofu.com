import { db } from './firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  addDoc,
  deleteDoc,
  query, 
  where, 
  orderBy, 
  limit,
  limitToLast,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  increment
} from 'firebase/firestore';
import type { UserProfile, Post, Comment, ChatRoom, Message, EventModel } from '../types/schema';

// Helper to safely convert Firestore Timestamp to JS Date
const toDate = (timestamp: any): Date => {
  if (timestamp && typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }
  return new Date(); // Fallback
};

// プロフィール取得のメモリキャッシュ（重複読み取り・Firestore課金の抑制）
const userProfileCache = new Map<string, UserProfile | null>();
const inFlightProfilePromises = new Map<string, Promise<UserProfile | null>>();

/**
 * プロフィール情報の取得（メモリキャッシュ対応・メールアドレス等の非公開情報は除外）
 */
export const getUserProfile = async (uid: string, forceRefresh: boolean = false): Promise<UserProfile | null> => {
  if (!uid) return null;
  if (!forceRefresh && userProfileCache.has(uid)) {
    return userProfileCache.get(uid) ?? null;
  }
  if (!forceRefresh && inFlightProfilePromises.has(uid)) {
    return inFlightProfilePromises.get(uid)!;
  }

  const fetchPromise = (async () => {
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const profile: UserProfile = {
          uid: docSnap.id,
          displayName: data.displayName || '',
          profileImageUrl: data.profileImageUrl || '',
          bio: data.bio || '',
          tags: Array.isArray(data.tags) ? data.tags : [],
          kokoro: data.kokoro || '',
          tokimeki: Array.isArray(data.tokimeki) ? data.tokimeki : [],
          privacySettings: {
            searchable: data.privacySettings?.searchable ?? true,
            chatAcceptance: data.privacySettings?.chatAcceptance ?? 'all',
          },
          createdAt: toDate(data.createdAt),
          updatedAt: toDate(data.updatedAt),
        };
        userProfileCache.set(uid, profile);
        return profile;
      }
      userProfileCache.set(uid, null);
      return null;
    } catch (error) {
      console.error("Error fetching user profile:", error);
      throw error;
    } finally {
      inFlightProfilePromises.delete(uid);
    }
  })();

  inFlightProfilePromises.set(uid, fetchPromise);
  return fetchPromise;
};

/**
 * プロフィール情報の更新（または作成）
 */
export const updateUserProfile = async (uid: string, data: Partial<Omit<UserProfile, 'uid' | 'createdAt' | 'updatedAt'>>): Promise<void> => {
  try {
    const docRef = doc(db, 'users', uid);
    await setDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    // キャッシュを破棄して次回最新を取得
    userProfileCache.delete(uid);
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }
};

/**
 * 新規投稿の作成（画像/小説）
 */
export const createPost = async (postData: Omit<Post, 'id' | 'createdAt' | 'updatedAt' | 'likeCount' | 'commentCount'>): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, 'posts'), {
      ...postData,
      likeCount: 0,
      commentCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error creating post:", error);
    throw error;
  }
};

/**
 * 特定ユーザーの所属するチャットルーム一覧取得
 */
export const getUserChatRooms = async (userId: string): Promise<ChatRoom[]> => {
  try {
    const q = query(
      collection(db, 'chatRooms'),
      where('members', 'array-contains', userId),
      limit(100)
    );
    const querySnapshot = await getDocs(q);
    const rooms = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        members: Array.isArray(data.members) ? data.members : [],
        lastMessage: data.lastMessage || '',
        lastUpdatedAt: toDate(data.lastUpdatedAt)
      } as ChatRoom;
    });
    return rooms.sort((a, b) => b.lastUpdatedAt.getTime() - a.lastUpdatedAt.getTime());
  } catch (error) {
    console.error("Error fetching chat rooms:", error);
    throw error;
  }
};

/**
 * 2人のユーザー間のチャットルームを取得、存在しなければ新規作成してroomIdを返す
 */
export const getOrCreateChatRoom = async (uid1: string, uid2: string): Promise<string> => {
  try {
    const existingRooms = await getUserChatRooms(uid1);
    const matched = existingRooms.find(
      room => room.members.includes(uid1) && room.members.includes(uid2) && room.members.length === 2
    );
    if (matched) {
      return matched.id;
    }

    const roomId = [uid1, uid2].sort().join('_');
    await setDoc(doc(db, 'chatRooms', roomId), {
      members: [uid1, uid2],
      lastMessage: '',
      lastUpdatedAt: serverTimestamp(),
    });
    return roomId;
  } catch (error) {
    console.error("Error getting or creating chat room:", error);
    throw error;
  }
};

/**
 * チャットルーム情報の取得
 */
export const getChatRoomById = async (roomId: string): Promise<ChatRoom | null> => {
  try {
    const docSnap = await getDoc(doc(db, 'chatRooms', roomId));
    if (!docSnap.exists()) return null;
    const data = docSnap.data();
    return {
      id: docSnap.id,
      members: Array.isArray(data.members) ? data.members : [],
      lastMessage: data.lastMessage || '',
      lastUpdatedAt: toDate(data.lastUpdatedAt),
    } as ChatRoom;
  } catch (error) {
    console.error("Error fetching chat room:", error);
    return null;
  }
};

/**
 * 特定チャットルームのメッセージをリアルタイム取得する関数（リスナー）
 * 直近 maxCount 件（デフォルト50件）のみ取得してFirestore読み取り課金を抑える
 * @param roomId チャットルームID
 * @param callback 新しいメッセージリストを受け取るコールバック関数
 * @param maxCount 取得する直近メッセージ件数（デフォルト: 50）
 * @returns リスナーを解除するための関数 (unsubscribe)
 */
export const subscribeToMessages = (
  roomId: string,
  callback: (messages: Message[]) => void,
  maxCount: number = 50
): () => void => {
  const q = query(
    collection(db, 'chatRooms', roomId, 'messages'),
    orderBy('createdAt', 'asc'),
    limitToLast(maxCount)
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: toDate(data.createdAt),
      } as Message;
    });
    callback(messages);
  }, (error) => {
    console.error("Error in message subscription:", error);
  });

  return unsubscribe;
};

/**
 * チャットメッセージの送信
 */
export const sendMessage = async (roomId: string, senderId: string, content: string): Promise<void> => {
  try {
    const messageData = {
      senderId,
      content,
      isRead: false,
      createdAt: serverTimestamp(),
    };
    
    // Add message
    await addDoc(collection(db, 'chatRooms', roomId, 'messages'), messageData);
    
    // Update room's lastMessage and lastUpdatedAt
    await updateDoc(doc(db, 'chatRooms', roomId), {
      lastMessage: content,
      lastUpdatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
};

/**
 * 新規イベントの作成
 */
export const createEvent = async (eventData: Omit<EventModel, 'id' | 'createdAt' | 'updatedAt' | 'currentAttendees' | 'status' | 'likeCount' | 'commentCount'>): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, 'events'), {
      ...eventData,
      currentAttendees: 1, // 開催者は参加者としてカウントする想定
      status: 'open',
      likeCount: 0,
      commentCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error creating event:", error);
    throw error;
  }
};

/**
 * いいねの切り替え (Optimistic UI向け)
 */
export const toggleLike = async (postId: string, userId: string, isLiking: boolean): Promise<void> => {
  try {
    const likeRef = doc(db, 'posts', postId, 'likes', userId);
    const postRef = doc(db, 'posts', postId);
    
    if (isLiking) {
      await setDoc(likeRef, { userId, createdAt: serverTimestamp() });
      await updateDoc(postRef, { likeCount: increment(1), updatedAt: serverTimestamp() });
    } else {
      await deleteDoc(likeRef);
      await updateDoc(postRef, { likeCount: increment(-1), updatedAt: serverTimestamp() });
    }
  } catch (error) {
    console.error("Error toggling like:", error);
    throw error;
  }
};

/**
 * いいね済みか確認
 */
export const checkHasLiked = async (postId: string, userId: string): Promise<boolean> => {
  try {
    const likeRef = doc(db, 'posts', postId, 'likes', userId);
    const likeSnap = await getDoc(likeRef);
    return likeSnap.exists();
  } catch (error) {
    console.error("Error checking like:", error);
    return false;
  }
};

/**
 * コメント作成
 */
export const createComment = async (postId: string, authorId: string, content: string): Promise<string> => {
  let docRef;
  try {
    console.log("Attempting to addDoc for comment...");
    docRef = await addDoc(collection(db, 'posts', postId, 'comments'), {
      postId,
      authorId,
      content,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    console.log("addDoc succeeded with ID:", docRef.id);
  } catch (error) {
    console.error("Error in addDoc (comments):", error);
    throw error;
  }
  
  try {
    console.log("Attempting to updateDoc for post commentCount...");
    const postRef = doc(db, 'posts', postId);
    await updateDoc(postRef, { commentCount: increment(1), updatedAt: serverTimestamp() });
    console.log("updateDoc succeeded");
    return docRef.id;
  } catch (error) {
    console.error("Error in updateDoc (posts):", error);
    throw error;
  }
};

/**
 * イベント一覧取得
 */
export const getEvents = async (): Promise<EventModel[]> => {
  try {
    const q = query(collection(db, 'events'), orderBy('createdAt', 'desc'), limit(100));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        startDate: toDate(data.startDate),
        endDate: toDate(data.endDate),
        createdAt: toDate(data.createdAt),
        updatedAt: toDate(data.updatedAt)
      } as EventModel;
    });
  } catch (error) {
    console.error("Error fetching events:", error);
    throw error;
  }
};

/**
 * イベント詳細取得
 */
export const getEventById = async (eventId: string): Promise<EventModel | null> => {
  try {
    const docRef = doc(db, 'events', eventId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        startDate: toDate(data.startDate),
        endDate: toDate(data.endDate),
        createdAt: toDate(data.createdAt),
        updatedAt: toDate(data.updatedAt),
      } as EventModel;
    }
    return null;
  } catch (error) {
    console.error("Error fetching event:", error);
    throw error;
  }
};

/**
 * イベントのいいね切り替え
 */
export const toggleEventLike = async (eventId: string, userId: string, isLiking: boolean): Promise<void> => {
  try {
    const likeRef = doc(db, 'events', eventId, 'likes', userId);
    const eventRef = doc(db, 'events', eventId);
    
    if (isLiking) {
      await setDoc(likeRef, { userId, createdAt: serverTimestamp() });
      await updateDoc(eventRef, { likeCount: increment(1), updatedAt: serverTimestamp() });
    } else {
      await deleteDoc(likeRef);
      await updateDoc(eventRef, { likeCount: increment(-1), updatedAt: serverTimestamp() });
    }
  } catch (error) {
    console.error("Error toggling event like:", error);
    throw error;
  }
};

/**
 * イベントのいいね確認
 */
export const checkEventHasLiked = async (eventId: string, userId: string): Promise<boolean> => {
  try {
    const likeRef = doc(db, 'events', eventId, 'likes', userId);
    const likeSnap = await getDoc(likeRef);
    return likeSnap.exists();
  } catch (error) {
    console.error("Error checking event like:", error);
    return false;
  }
};

/**
 * イベントへのコメント作成
 */
export const createEventComment = async (eventId: string, authorId: string, content: string): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, 'events', eventId, 'comments'), {
      eventId,
      authorId,
      content,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    await updateDoc(doc(db, 'events', eventId), { 
      commentCount: increment(1), 
      updatedAt: serverTimestamp() 
    });
    
    return docRef.id;
  } catch (error) {
    console.error("Error creating event comment:", error);
    throw error;
  }
};

/**
 * イベントコメントの購読（直近 maxCount 件に制限して課金を抑制）
 */
export const subscribeToEventComments = (
  eventId: string,
  callback: (comments: Comment[]) => void,
  maxCount: number = 50
): () => void => {
  const q = query(
    collection(db, 'events', eventId, 'comments'),
    orderBy('createdAt', 'asc'),
    limitToLast(maxCount)
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const comments = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: toDate(data.createdAt),
        updatedAt: toDate(data.updatedAt), // comments should map this safely
      } as Comment;
    });
    callback(comments);
  }, (error) => {
    console.error("Error in event comment subscription:", error);
  });

  return unsubscribe;
};

/**
 * イベントの更新
 */
export const updateEvent = async (eventId: string, eventData: Partial<Omit<EventModel, 'id' | 'organizerId' | 'createdAt'>>): Promise<void> => {
  try {
    const docRef = doc(db, 'events', eventId);
    await updateDoc(docRef, {
      ...eventData,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating event:", error);
    throw error;
  }
};

/**
 * イベントの削除
 */
export const deleteEvent = async (eventId: string): Promise<void> => {
  try {
    const docRef = doc(db, 'events', eventId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Error deleting event:", error);
    throw error;
  }
};
