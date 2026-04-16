import { RoadmapStep, Badge } from '../types';

export const ROADMAP_STEPS: RoadmapStep[] = [
  {
    id: 'profile_completed',
    title: 'Profile Setup',
    description: 'Complete your professional profile with bio and location.',
    badgeId: 'identity_established'
  },
  {
    id: 'career_paths_set',
    title: 'Vision and Goals',
    description: 'Define your desired career paths and goals.',
    badgeId: 'visionary'
  },
  {
    id: 'cv_analyzed',
    title: 'CV Analysis',
    description: 'Get your CV analyzed by our AI to see your ATS score.',
    badgeId: 'the_analyst'
  },
  {
    id: 'course_joined',
    title: 'Learning Path',
    description: 'Join a recommended course to bridge your skill gaps.',
    badgeId: 'scholar'
  },
  {
    id: 'buddy_connected',
    title: 'Career Buddy',
    description: 'Connect and chat with a career buddy for guidance.',
    badgeId: 'network_builder'
  },
  {
    id: 'network_growth',
    title: 'Community Leader',
    description: 'Build your network by connecting with 3 or more buddies.',
    badgeId: 'influencer'
  },
  {
    id: 'interview_prep',
    title: 'Interview Ready',
    description: 'Complete an interview simulation to sharpen your skills.',
    badgeId: 'polished'
  },
  {
    id: 'first_job_applied',
    title: 'First Application',
    description: 'Apply to your very first job on the platform.',
    badgeId: 'first_step_taken'
  },
  {
    id: 'multiple_jobs_applied',
    title: 'Active Hunter',
    description: 'Submit at least 3 job applications.',
    badgeId: 'job_hunter'
  },
  {
    id: 'offer_received',
    title: 'Offer Received',
    description: 'Get your first job application accepted!',
    badgeId: 'offer_achieved'
  }
];

export const BADGE_DEFINITIONS: Record<string, Omit<Badge, 'earnedAt'>> = {
  identity_established: {
    id: 'identity_established',
    title: 'Identity Established',
    description: 'You have successfully set up your professional profile.',
    icon: 'User',
    color: '#3B82F6' // Blue
  },
  visionary: {
    id: 'visionary',
    title: 'The Visionary',
    description: 'Defined your career goals and paths.',
    icon: 'Eye',
    color: '#F59E0B' // Amber
  },
  the_analyst: {
    id: 'the_analyst',
    title: 'The Analyst',
    description: 'Completed your first CV analysis.',
    icon: 'FileText',
    color: '#10B981' // Emerald
  },
  scholar: {
    id: 'scholar',
    title: 'The Scholar',
    description: 'Started a learning journey with a course.',
    icon: 'BookOpen',
    color: '#3B82F6' // Blue
  },
  network_builder: {
    id: 'network_builder',
    title: 'Network Builder',
    description: 'Connected with a career buddy.',
    icon: 'Users',
    color: '#8B5CF6' // Violet
  },
  influencer: {
    id: 'influencer',
    title: 'Community Leader',
    description: 'Connected with multiple career buddies.',
    icon: 'Zap',
    color: '#EC4899' // Pink
  },
  polished: {
    id: 'polished',
    title: 'Interview Polished',
    description: 'Mastered the art of the interview.',
    icon: 'Mic',
    color: '#6366F1' // Indigo
  },
  first_step_taken: {
    id: 'first_step_taken',
    title: 'First Step Taken',
    description: 'Applied to your first job.',
    icon: 'Briefcase',
    color: '#F59E0B' // Amber
  },
  job_hunter: {
    id: 'job_hunter',
    title: 'Job Hunter',
    description: 'Submitted multiple job applications.',
    icon: 'Target',
    color: '#EF4444' // Red
  },
  offer_achieved: {
    id: 'offer_achieved',
    title: 'Offer Achieved',
    description: 'Received a job offer!',
    icon: 'Medal',
    color: '#FCD34D' // Gold
  }
};
