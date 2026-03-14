import React from 'react';
import { InteractionProps } from './types';
import StandardCardView from './StandardCardView';
import TvRemoteView from './TvRemoteView';
import DirectionalNavView from './DirectionalNavView';
import SceneSelectionView from './SceneSelectionView';
import DialogueChoiceView from './DialogueChoiceView';
import { AnimatePresence, motion } from 'framer-motion';

// Main manager component to determine which interaction type to render
// Links files like tv-remote-view.tsx, directional-nav-view.tsx, etc.
const QuestionRenderer: React.FC<InteractionProps> = (props) => {
    const { question } = props;
    const type = question.interactionType || 'standard-card';

    let Component;

    // Determine which interaction type is it
    switch (type) {
        case 'tv-remote':
            Component = TvRemoteView;
            break;
        case 'directional-nav':
            Component = DirectionalNavView;
            break;
        case 'scene-selection':
            Component = SceneSelectionView;
            break;
        case 'dialogue-choice':
            Component = DialogueChoiceView;
            break;
        case 'standard-card':
        default:
            Component = StandardCardView;
            break;
    }

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={question.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="w-full flex justify-center perspective-1000"
            >
                {/* Render the component */}
                <Component {...props} />
            </motion.div>
        </AnimatePresence>
    );
};

export default QuestionRenderer;