// Floating feedback trigger button that opens the feedback modal
import React, { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import FeedbackModal from '../feedback/FeedbackModal';

const FeedbackButton: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-6 right-6 p-4 rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 
                 text-white shadow-lg hover:shadow-xl hover:shadow-teal-200 
                 transition-all duration-300 hover:scale-110 z-40 group"
        title="Give Feedback"
      >
        <MessageSquare className="w-6 h-6" />
        
        {/* Tooltip */}
        <span className="absolute bottom-full right-0 mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs 
                       rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 
                       whitespace-nowrap pointer-events-none">
          Give Feedback
        </span>
      </button>

      <FeedbackModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </>
  );
};

export default FeedbackButton;