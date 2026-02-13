import React, { useEffect, useState } from 'react';
import { getAnnouncement, Announcement } from '../../services/announcementService';

/**
 * Marquee Announcement Component
 * Displays scrolling announcement at the top of the page
 */
const AnnouncementMarquee: React.FC = () => {
    const [announcement, setAnnouncement] = useState<Announcement | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchAnnouncement = async () => {
            try {
                const data = await getAnnouncement();
                setAnnouncement(data);
            } catch (error) {
                console.error('Failed to fetch announcement:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAnnouncement();

        // Refresh every 5 minutes
        const interval = setInterval(fetchAnnouncement, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    // Don't render if loading, no announcement, or not active
    if (isLoading || !announcement || !announcement.isActive || !announcement.content) {
        return null;
    }

    return (
        <div className="announcement-marquee">
            <div className="marquee-container">
                <span className="marquee-icon">📢</span>
                <div className="marquee-content">
                    <span className="marquee-text">{announcement.content}</span>
                </div>
            </div>
            <style>{`
                .announcement-marquee {
                    background: linear-gradient(90deg, #4f46e5, #7c3aed, #a855f7);
                    color: white;
                    padding: 8px 16px;
                    overflow: hidden;
                    position: relative;
                    z-index: 50;
                }
                
                .marquee-container {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                
                .marquee-icon {
                    font-size: 18px;
                    flex-shrink: 0;
                }
                
                .marquee-content {
                    overflow: hidden;
                    flex: 1;
                    position: relative;
                }
                
                .marquee-text {
                    display: inline-block;
                    white-space: nowrap;
                    animation: marquee 20s linear infinite;
                    font-weight: 500;
                    font-size: 14px;
                }
                
                @keyframes marquee {
                    0% {
                        transform: translateX(100%);
                    }
                    100% {
                        transform: translateX(-100%);
                    }
                }
                
                .announcement-marquee:hover .marquee-text {
                    animation-play-state: paused;
                }
            `}</style>
        </div>
    );
};

export default AnnouncementMarquee;
