/**
 * Avatar Configuration
 *
 * List of available avatar stickers for students.
 * Uses Microsoft Fluent UI Emoji CDN (jsdelivr) for consistent, high-quality 3D sticker images.
 */

const FLUENT_CDN = 'https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets';

export interface AvatarOption {
    id: string;
    name: string;
    url: string;
    category: 'animal' | 'character' | 'expression';
}

export const AVATAR_LIST: AvatarOption[] = [
    // --- Animals ---
    { id: 'owl', name: 'Cú Mèo', url: `${FLUENT_CDN}/Owl/3D/owl_3d.png`, category: 'animal' },
    { id: 'cat', name: 'Mèo', url: `${FLUENT_CDN}/Cat%20face/3D/cat_face_3d.png`, category: 'animal' },
    { id: 'dog', name: 'Chó', url: `${FLUENT_CDN}/Dog%20face/3D/dog_face_3d.png`, category: 'animal' },
    { id: 'bear', name: 'Gấu', url: `${FLUENT_CDN}/Bear/3D/bear_3d.png`, category: 'animal' },
    { id: 'fox', name: 'Cáo', url: `${FLUENT_CDN}/Fox/3D/fox_3d.png`, category: 'animal' },
    { id: 'rabbit', name: 'Thỏ', url: `${FLUENT_CDN}/Rabbit%20face/3D/rabbit_face_3d.png`, category: 'animal' },
    { id: 'panda', name: 'Gấu Trúc', url: `${FLUENT_CDN}/Panda/3D/panda_3d.png`, category: 'animal' },
    { id: 'unicorn', name: 'Kỳ Lân', url: `${FLUENT_CDN}/Unicorn/3D/unicorn_3d.png`, category: 'animal' },
    { id: 'monkey', name: 'Khỉ', url: `${FLUENT_CDN}/Monkey%20face/3D/monkey_face_3d.png`, category: 'animal' },
    { id: 'lion', name: 'Sư Tử', url: `${FLUENT_CDN}/Lion/3D/lion_3d.png`, category: 'animal' },
    { id: 'koala', name: 'Gấu Koala', url: `${FLUENT_CDN}/Koala/3D/koala_3d.png`, category: 'animal' },
    { id: 'penguin', name: 'Chim Cánh Cụt', url: `${FLUENT_CDN}/Penguin/3D/penguin_3d.png`, category: 'animal' },

    // --- Characters ---
    { id: 'robot', name: 'Robot', url: `${FLUENT_CDN}/Robot/3D/robot_3d.png`, category: 'character' },
    { id: 'alien', name: 'Người Ngoài Hành Tinh', url: `${FLUENT_CDN}/Alien/3D/alien_3d.png`, category: 'character' },
    { id: 'ghost', name: 'Ma', url: `${FLUENT_CDN}/Ghost/3D/ghost_3d.png`, category: 'character' },
    { id: 'astronaut', name: 'Phi Hành Gia', url: `${FLUENT_CDN}/Ringed%20planet/3D/ringed_planet_3d.png`, category: 'character' },

    // --- Expressions ---
    { id: 'star_eyes', name: 'Ngôi Sao', url: `${FLUENT_CDN}/Star-struck/3D/star-struck_3d.png`, category: 'expression' },
    { id: 'cool', name: 'Ngầu', url: `${FLUENT_CDN}/Smiling%20face%20with%20sunglasses/3D/smiling_face_with_sunglasses_3d.png`, category: 'expression' },
    { id: 'nerd', name: 'Học Giỏi', url: `${FLUENT_CDN}/Nerd%20face/3D/nerd_face_3d.png`, category: 'expression' },
    { id: 'party', name: 'Tiệc Tùng', url: `${FLUENT_CDN}/Partying%20face/3D/partying_face_3d.png`, category: 'expression' },
];

/**
 * Get avatar URL by key. Falls back to default owl avatar.
 */
export const getAvatarUrl = (avatarId?: string): string => {
    if (!avatarId) return AVATAR_LIST[0].url; // Default: Owl
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
