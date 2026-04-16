export type UserRole = 'student' | 'recruiter';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: string;
  birthday?: string;
  bio?: string;
  desiredJobs?: string[];
  location?: string;
  age?: number;
  phone?: string;
  photoURL?: string;
  // Recruiter specific
  companyName?: string;
  companyLogo?: string;
  companyDescription?: string;
  badges?: Badge[];
  roadmapProgress?: Record<string, boolean>;
}

export interface Badge {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  earnedAt: string;
}

export interface RoadmapStep {
  id: string;
  title: string;
  description: string;
  badgeId: string;
}

export interface JobApplication {
  id: string;
  jobId: string;
  studentId: string;
  studentName: string;
  studentPhone: string;
  studentEmail: string;
  cvText: string;
  status: 'pending' | 'reviewed' | 'accepted' | 'rejected';
  createdAt: string;
}

export interface CV {
  id: string;
  studentId: string;
  cvText: string;
  analysis: string;
  atsScore: number;
  suggestedCourses: Course[];
  createdAt: string;
}

export interface Course {
  title: string;
  provider: string;
  url: string;
  relevance: string;
}

export interface Job {
  id: string;
  recruiterId: string;
  title: string;
  company: string;
  companyLogo?: string;
  location: string;
  description: string;
  applicationLink?: string;
  createdAt: string;
}
