import React from 'react';
import { UserProfile, Badge } from '../types';
import { ROADMAP_STEPS, BADGE_DEFINITIONS } from '../constants/roadmap';
import { 
  CheckCircle2, 
  Circle, 
  Medal, 
  FileText, 
  Users, 
  Briefcase, 
  Target, 
  User as UserIcon,
  Lock,
  Eye,
  BookOpen,
  Zap,
  Mic
} from 'lucide-react';
import { motion } from 'motion/react';

const IconMap: Record<string, any> = {
  User: UserIcon,
  FileText: FileText,
  Users: Users,
  Briefcase: Briefcase,
  Target: Target,
  Medal: Medal,
  Eye: Eye,
  BookOpen: BookOpen,
  Zap: Zap,
  Mic: Mic
};

interface CareerRoadmapProps {
  profile: UserProfile;
}

const CareerRoadmap: React.FC<CareerRoadmapProps> = ({ profile }) => {
  const progress = profile.roadmapProgress || {};
  
  const completedCount = Object.values(progress).filter(Boolean).length;
  const totalCount = ROADMAP_STEPS.length;
  const progressPercentage = (completedCount / totalCount) * 100;

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-4 pb-16">
      <div className="text-center space-y-3">
        <motion.h2 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-black text-skope-dark dark:text-white tracking-tight uppercase"
        >
          Career <span className="text-skope-navy dark:text-skope-blue">Roadmap</span>
        </motion.h2>
        <p className="text-slate-500 dark:text-slate-400 text-xs font-medium max-w-xl mx-auto leading-relaxed">
          Follow the path to success. Complete milestones to unlock professional badges and level up your career.
        </p>
        
        <div className="flex items-center justify-center gap-3 pt-2">
          <div className="w-40 h-1.5 bg-slate-100 dark:bg-skope-deep rounded-full overflow-hidden border border-slate-200 dark:border-skope-steel">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              className="h-full bg-skope-navy dark:bg-skope-blue"
            />
          </div>
          <span className="text-[10px] font-black text-skope-navy dark:text-skope-blue">{Math.round(progressPercentage)}%</span>
        </div>
      </div>

      <div className="relative mt-8">
        {/* The Road */}
        <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-8 md:w-12 bg-slate-800 dark:bg-slate-900 rounded-full overflow-hidden">
          <div className="absolute inset-0 border-x border-slate-700/50"></div>
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px border-l border-dashed border-white/10"></div>
        </div>

        {/* Mobile Line (Secondary) */}
        <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-px bg-slate-200 dark:bg-skope-steel md:hidden opacity-20"></div>

        <div className="space-y-10 relative">
          {ROADMAP_STEPS.map((step, index) => {
            const isCompleted = progress[step.id];
            const badge = BADGE_DEFINITIONS[step.badgeId];
            const Icon = IconMap[badge.icon] || Medal;
            const isEven = index % 2 === 0;

            return (
              <div key={step.id} className="relative">
                {/* Connector Line */}
                <div className={`absolute top-1/2 -translate-y-1/2 h-px bg-slate-200 dark:bg-skope-steel hidden md:block ${
                  isEven ? 'left-[calc(50%+24px)] right-0' : 'right-[calc(50%+24px)] left-0'
                }`}></div>

                <div className={`flex flex-col md:flex-row items-center gap-4 ${isEven ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
                  {/* Step Content */}
                  <motion.div 
                    initial={{ opacity: 0, x: isEven ? 20 : -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    className={`flex-1 w-full md:w-auto ${isEven ? 'md:text-left' : 'md:text-right'}`}
                  >
                    <div className={`bg-white dark:bg-skope-dark p-4 rounded-2xl shadow-sm border transition-all hover:border-skope-blue duration-300 ${
                      isCompleted 
                        ? 'border-skope-navy/20 dark:border-skope-blue/20' 
                        : 'border-skope-light/30 dark:border-skope-steel opacity-60 grayscale'
                    }`}>
                      <div className={`flex items-center gap-2 mb-1.5 ${isEven ? 'flex-row' : 'md:flex-row-reverse'}`}>
                        <div className={`p-1.5 rounded-lg ${isCompleted ? 'bg-skope-navy/5 dark:bg-skope-blue/5 text-skope-navy dark:text-skope-blue' : 'bg-slate-50 dark:bg-skope-deep text-slate-300'}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <h3 className="text-sm font-black text-skope-dark dark:text-white uppercase tracking-tight">
                          {step.title}
                        </h3>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        {step.description}
                      </p>
                      
                      {isCompleted && (
                        <div className="mt-2 flex items-center gap-1 text-[8px] font-black text-green-500 uppercase tracking-widest">
                          <CheckCircle2 className="w-3 h-3" />
                          Completed
                        </div>
                      )}
                    </div>
                  </motion.div>

                  {/* Road Point */}
                  <div className="relative z-10 flex flex-col items-center">
                    <motion.div 
                      initial={{ scale: 0 }}
                      whileInView={{ scale: 1 }}
                      viewport={{ once: true }}
                      className={`w-10 h-10 rounded-full flex items-center justify-center border ${
                        isCompleted 
                          ? 'bg-skope-navy dark:bg-skope-blue border-white dark:border-skope-dark text-white scale-110' 
                          : 'bg-white dark:bg-skope-dark border-slate-200 dark:border-skope-steel text-slate-300'
                      }`}
                    >
                      <span className="text-xs font-black">{index + 1}</span>
                    </motion.div>
                    
                    {/* Vertical Line to Road (Visual only) */}
                    <div className={`w-px h-6 bg-slate-200 dark:bg-skope-steel md:hidden`}></div>
                  </div>

                  {/* Badge Preview */}
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    className="flex-1 hidden md:flex justify-center"
                  >
                    <div className={`group relative w-16 h-16 rounded-xl flex items-center justify-center transition-all duration-500 ${
                      isCompleted 
                        ? 'bg-white dark:bg-skope-dark shadow-sm rotate-6 hover:rotate-0 border border-skope-light/10' 
                        : 'bg-slate-50 dark:bg-skope-deep/10 border border-dashed border-slate-200 dark:border-skope-steel'
                    }`}>
                      {isCompleted ? (
                        <>
                          <div className="absolute inset-0 rounded-xl opacity-10 blur-md" style={{ backgroundColor: badge.color }}></div>
                          <Icon className="w-8 h-8 relative z-10" style={{ color: badge.color }} />
                          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-skope-dark text-white text-[7px] font-black px-1.5 py-0.5 rounded-full whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                            {badge.title}
                          </div>
                        </>
                      ) : (
                        <Lock className="w-6 h-6 text-slate-200 dark:text-skope-steel" />
                      )}
                    </div>
                  </motion.div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CareerRoadmap;
