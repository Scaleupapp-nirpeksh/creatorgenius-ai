// frontend/src/components/IdeaCard.tsx
import React from 'react';
import { Idea } from '@/services/api';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

interface IdeaCardProps {
  idea: Idea;
  isSaving?: boolean;
  isSaved?: boolean;
  onSave?: () => void;
  onDelete?: () => void;
  showDeleteOption?: boolean;
}

export const IdeaCard: React.FC<IdeaCardProps> = ({
  idea,
  isSaving = false,
  isSaved = false,
  onSave,
  onDelete,
  showDeleteOption = false,
}) => {
  // Determine what action button to show
  const renderActionButton = () => {
    if (showDeleteOption) {
      return (
        <Button
          variant="danger"
          size="sm"
          isLoading={isSaving}
          disabled={isSaving}
          onClick={onDelete}
          className="w-full sm:w-auto"
        >
          {isSaving ? 'Deleting...' : 'Delete Idea'}
        </Button>
      );
    }
    
    return (
      <Button
        variant={isSaved ? 'success' : 'primary'}
        size="sm"
        isLoading={isSaving}
        disabled={isSaving || isSaved}
        onClick={onSave}
        leftIcon={isSaved ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        ) : undefined}
        className="w-full sm:w-auto"
      >
        {isSaved ? 'Saved' : (isSaving ? 'Saving...' : 'Save Idea')}
      </Button>
    );
  };

  return (
    <Card hoverEffect className="h-full flex flex-col">
      <Card.Content className="flex-grow">
        <h3 className="text-lg font-bold mb-3 text-primary-600 dark:text-primary-400 line-clamp-2">
          {idea.title}
        </h3>
        
        <div className="space-y-3">
          <div>
            <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Angle</h4>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">{idea.angle}</p>
          </div>
          
          {idea.hook && (
            <div>
              <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Hook</h4>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">{idea.hook}</p>
            </div>
          )}
          
          {idea.intendedEmotion && (
            <div>
              <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Intended Emotion</h4>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary-100 text-secondary-800 dark:bg-secondary-900/30 dark:text-secondary-300">
                  {idea.intendedEmotion}
                </span>
              </p>
            </div>
          )}
          
          {idea.structure_points && idea.structure_points.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Structure</h4>
              <ul className="space-y-1">
                {idea.structure_points.map((point, idx) => (
                  <li key={idx} className="text-sm text-neutral-600 dark:text-neutral-400 pl-4 relative">
                    <span className="absolute left-0 top-2 w-1.5 h-1.5 rounded-full bg-primary-500"></span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {idea.platform_suitability && (
            <div>
              <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Platform Suitability</h4>
              <div>
                <span className={`
                  inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                  ${idea.platform_suitability === 'High' 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                    : idea.platform_suitability === 'Medium'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                  }
                `}>
                  {idea.platform_suitability}
                </span>
              </div>
            </div>
          )}
          
          <div>
            <h4 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Tags</h4>
            <div className="flex flex-wrap gap-1.5">
              {idea.tags.map((tag, idx) => (
                <span 
                  key={idx}
                  className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
          
          {idea.savedAt && (
            <div className="text-xs text-neutral-500 dark:text-neutral-500 pt-2">
              Saved on {new Date(idea.savedAt).toLocaleDateString('en-IN', { 
                day: 'numeric', 
                month: 'short', 
                year: 'numeric' 
              })}
            </div>
          )}
        </div>
      </Card.Content>
      
      <Card.Footer className="flex justify-end">
        {renderActionButton()}
      </Card.Footer>
    </Card>
  );
};

export default IdeaCard;