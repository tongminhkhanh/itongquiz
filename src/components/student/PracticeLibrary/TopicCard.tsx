import React from 'react';
import { motion } from 'framer-motion';
import { Play } from 'lucide-react';

interface TopicCardProps {
    topic: string; // e.g., "#Phép_Nhân"
    count: number;
    onClick: (topic: string) => void;
    index?: number;
}

// Function to generate a deterministic pastel color based on the topic string
const getBackgroundColor = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 70%, 90%)`;
};

const getTextColor = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 80%, 30%)`;
};

const TopicCard: React.FC<TopicCardProps> = ({ topic, count, onClick, index = 0 }) => {
    const formattedTopic = topic.replace('#', '').replace(/_/g, ' ');
    const bgColor = getBackgroundColor(topic);
    const textColor = getTextColor(topic);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => onClick(topic)}
            className="group cursor-pointer relative overflow-hidden rounded-3xl p-6 transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:-translate-y-1"
            style={{ backgroundColor: bgColor }}
        >
            <div className="flex flex-col h-full justify-between items-start z-10 relative">
                <div
                    className="px-3 py-1 bg-white/50 backdrop-blur-sm rounded-full mb-4 text-sm font-bold shadow-sm"
                    style={{ color: textColor }}
                >
                    Chuyên đề
                </div>

                <h3
                    className="text-xl md:text-2xl font-black mb-8 leading-tight"
                    style={{ color: textColor }}
                >
                    {formattedTopic}
                </h3>

                <div
                    className="flex mt-auto items-center justify-between w-full font-bold opacity-80 group-hover:opacity-100 transition-opacity"
                    style={{ color: textColor }}
                >
                    <span>{count} câu hỏi ngẫu nhiên</span>
                    <div className="bg-white/40 p-2 rounded-full group-hover:bg-white transition-colors duration-300">
                        <Play className="w-5 h-5 ml-0.5" />
                    </div>
                </div>
            </div>

            {/* Decorative background circle */}
            <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/20 rounded-full group-hover:scale-150 transition-transform duration-500 pointer-events-none"></div>
        </motion.div>
    );
};

export default TopicCard;
