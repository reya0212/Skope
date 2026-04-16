import { doc, updateDoc, getDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';
import { BADGE_DEFINITIONS } from '../constants/roadmap';
import { Badge } from '../types';

/**
 * Updates a specific roadmap step for a user and awards the corresponding badge if not already earned.
 */
export const completeRoadmapStep = async (userId: string, stepId: string) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) return;

    const userData = userDoc.data();
    const currentProgress = userData.roadmapProgress || {};
    const currentBadges = userData.badges || [];

    // If already completed, do nothing
    if (currentProgress[stepId]) return;

    // 1. Update progress
    const newProgress = { ...currentProgress, [stepId]: true };

    // 2. Find corresponding badge
    const badgeId = BADGE_DEFINITIONS[stepId]?.id; // Assuming stepId matches badgeId or we find it
    // Wait, my ROADMAP_STEPS has badgeId. Let's find it.
    const { ROADMAP_STEPS } = await import('../constants/roadmap');
    const step = ROADMAP_STEPS.find(s => s.id === stepId);
    
    if (!step) return;

    const badgeDef = BADGE_DEFINITIONS[step.badgeId];
    
    // Check if badge already earned
    const hasBadge = currentBadges.some((b: Badge) => b.id === step.badgeId);

    const updates: any = {
      roadmapProgress: newProgress
    };

    if (!hasBadge && badgeDef) {
      const newBadge: Badge = {
        ...badgeDef,
        earnedAt: new Date().toISOString()
      };
      updates.badges = arrayUnion(newBadge);
    }

    await updateDoc(userRef, updates);
    console.log(`Step ${stepId} completed and badge ${step.badgeId} awarded.`);
  } catch (error) {
    console.error('Error completing roadmap step:', error);
  }
};

/**
 * Checks if the user has completed their profile and updates roadmap if so.
 */
export const checkProfileCompletion = async (userId: string, profile: any) => {
  if (profile.bio && profile.location && profile.displayName) {
    await completeRoadmapStep(userId, 'profile_completed');
  }
};
