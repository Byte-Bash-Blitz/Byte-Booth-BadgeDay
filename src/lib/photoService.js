// Photo service for managing photo data with Firestore
import { collection, addDoc, getDocs, orderBy, query, updateDoc, doc, increment, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from './firebase';

// Collection name in Firestore
const PHOTOS_COLLECTION = 'badge-day-photos';

// Save photo metadata to Firestore
export const savePhotoToFirestore = async (photoData) => {
  try {
    const docRef = await addDoc(collection(db, PHOTOS_COLLECTION), {
      ...photoData,
      uploadedAt: new Date(),
      likes: 0,
      likedBy: [],
      caption: photoData.caption || '',
      event: 'badge-day-2025'
    });
    
    return {
      id: docRef.id,
      ...photoData,
      uploadedAt: new Date(),
      likes: 0,
      likedBy: [],
      caption: photoData.caption || ''
    };
  } catch (error) {
    console.error('Error saving photo to Firestore:', error);
    throw error;
  }
};

// Get all photos from Firestore
export const getPhotosFromFirestore = async () => {
  try {
    const q = query(
      collection(db, PHOTOS_COLLECTION), 
      orderBy('uploadedAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const photos = [];
    
    querySnapshot.forEach((doc) => {
      photos.push({
        id: doc.id,
        ...doc.data(),
        uploadedAt: doc.data().uploadedAt?.toDate() || new Date()
      });
    });
    
    return photos;
  } catch (error) {
    console.error('Error getting photos from Firestore:', error);
    // Return empty array if Firestore fails
    return [];
  }
};

// Toggle like on a photo (Instagram-style)
export const togglePhotoLike = async (photoId, userId = 'anonymous') => {
  try {
    const photoRef = doc(db, PHOTOS_COLLECTION, photoId);
    
    // Get current photo data to check if user already liked
    const photos = await getPhotosFromFirestore();
    const photo = photos.find(p => p.id === photoId);
    
    if (!photo) {
      throw new Error('Photo not found');
    }
    
    const hasLiked = photo.likedBy?.includes(userId);
    
    if (hasLiked) {
      // Unlike: remove user from likedBy array and decrement likes
      await updateDoc(photoRef, {
        likes: increment(-1),
        likedBy: arrayRemove(userId)
      });
      return { liked: false, newLikeCount: Math.max(0, photo.likes - 1) };
    } else {
      // Like: add user to likedBy array and increment likes
      await updateDoc(photoRef, {
        likes: increment(1),
        likedBy: arrayUnion(userId)
      });
      return { liked: true, newLikeCount: photo.likes + 1 };
    }
  } catch (error) {
    console.error('Error toggling photo like:', error);
    throw error;
  }
};

// Legacy function for backward compatibility
export const likePhoto = async (photoId) => {
  try {
    const result = await togglePhotoLike(photoId);
    return result;
  } catch (error) {
    console.error('Error liking photo:', error);
    throw error;
  }
};
