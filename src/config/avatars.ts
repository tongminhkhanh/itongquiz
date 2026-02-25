/**
 * Avatar Configuration — Chibi Children Edition
 *
 * Cute chibi-style avatars of Vietnamese elementary school children.
 * Hosted on Cloudinary (cloud: dwv7hot9x, folder: itongquiz/avatars).
 * AI-generated, unique to iTong Quiz.
 */

const CLOUDINARY_BASE = 'https://res.cloudinary.com/dwv7hot9x/image/upload';

// Auto-optimize: resize to 200x200, auto format, auto quality
const avatarUrl = (id: string) =>
    `${CLOUDINARY_BASE}/w_200,h_200,c_fill,f_auto,q_auto/itongquiz/avatars/${id}`;

export interface AvatarOption {
    id: string;
    name: string;
    url: string;
    category: 'girl' | 'boy';
}

export const AVATAR_LIST: AvatarOption[] = [
    // --- Girls ---
    { id: 'girl_01', name: 'Bé Hoa', url: avatarUrl('girl_01'), category: 'girl' },
    { id: 'girl_02', name: 'Bé Đào', url: avatarUrl('girl_02'), category: 'girl' },
    { id: 'girl_03', name: 'Bé Tím', url: avatarUrl('girl_03'), category: 'girl' },
    { id: 'girl_04', name: 'Bé Thảo', url: avatarUrl('girl_04'), category: 'girl' },
    { id: 'girl_05', name: 'Bé Mint', url: avatarUrl('girl_05'), category: 'girl' },
    { id: 'girl_06', name: 'Bé Cầu Vồng', url: avatarUrl('girl_06'), category: 'girl' },
    { id: 'girl_07', name: 'Bé Nắng', url: avatarUrl('girl_07'), category: 'girl' },
    { id: 'girl_08', name: 'Bé Jean', url: avatarUrl('girl_08'), category: 'girl' },

    // --- Boys ---
    { id: 'boy_01', name: 'Bé Minh', url: avatarUrl('boy_01'), category: 'boy' },
    { id: 'boy_02', name: 'Bé Sao', url: avatarUrl('boy_02'), category: 'boy' },
    { id: 'boy_03', name: 'Bé Cam', url: avatarUrl('boy_03'), category: 'boy' },
    { id: 'boy_04', name: 'Bé Thông Minh', url: avatarUrl('boy_04'), category: 'boy' },
    { id: 'boy_05', name: 'Bé Khỏe', url: avatarUrl('boy_05'), category: 'boy' },
    { id: 'boy_06', name: 'Bé Navy', url: avatarUrl('boy_06'), category: 'boy' },
];

/**
 * Get avatar URL by key. Falls back to default girl_01 avatar.
 */
export const getAvatarUrl = (avatarId?: string): string => {
    if (!avatarId) return AVATAR_LIST[0].url;
    const found = AVATAR_LIST.find(a => a.id === avatarId);
    return found ? found.url : AVATAR_LIST[0].url;
};

/**
 * Get avatar name by key.
 */
export const getAvatarName = (avatarId?: string): string => {
    if (!avatarId) return AVATAR_LIST[0].name;
    const found = AVATAR_LIST.find(a => a.id === avatarId);
    return found ? found.name : AVATAR_LIST[0].name;
};
