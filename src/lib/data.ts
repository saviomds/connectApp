export type UserCategory = 'professional' | 'entrepreneur' | 'creator' | 'young_youth' | 'divorced' | 'company';

export interface Profile {
  id: string;
  name: string;
  age: number;
  bio: string;
  category: UserCategory;
  photo: string;
  photos: string[];
  profession: string;
  company?: string;
  location: string;
  distanceKm: number;
  interests: string[];
  isOnline: boolean;
  isVerified: boolean;
  isPremium: boolean;
  premiumTier?: 'gold' | 'platinum';
  matchPercent?: number;
}

export interface Message {
  id: string;
  senderId: string;
  content: string;
  timestamp: Date;
  seen: boolean;
}

export interface Conversation {
  id: string;
  profile: Profile;
  lastMessage: string;
  lastTime: Date;
  unread: number;
  messages: Message[];
}

const PHOTOS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&q=85',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=800&q=85',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&q=85',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=85',
  'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=800&q=85',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&q=85',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&q=85',
  'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=800&q=85',
  'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=85',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800&q=85',
];

export const PROFILES: Profile[] = [
  {
    id: '1', name: 'Sophia Chen', age: 28,
    bio: 'Product designer at Figma. Building beautiful things that matter. Based in SF, open to meaningful connections.',
    category: 'professional',
    photo: PHOTOS[0], photos: [PHOTOS[0], PHOTOS[2]],
    profession: 'Product Designer', company: 'Figma',
    location: 'San Francisco, USA', distanceKm: 3,
    interests: ['Design', 'Travel', 'Coffee', 'Yoga'],
    isOnline: true, isVerified: true, isPremium: true, premiumTier: 'platinum', matchPercent: 94,
  },
  {
    id: '2', name: 'Marcus Rivera', age: 33,
    bio: "Serial entrepreneur. 2x exits. Building the future of fintech. Let's connect over ideas that change the world.",
    category: 'entrepreneur',
    photo: PHOTOS[3], photos: [PHOTOS[3], PHOTOS[5]],
    profession: 'CEO & Founder', company: 'NovaPay',
    location: 'New York, USA', distanceKm: 12,
    interests: ['Startups', 'Finance', 'Hiking', 'Investing'],
    isOnline: false, isVerified: true, isPremium: true, premiumTier: 'gold', matchPercent: 87,
  },
  {
    id: '3', name: 'Amara Osei', age: 26,
    bio: 'Digital creator & filmmaker. Tell stories that move people. Working with top brands across Africa & Europe.',
    category: 'creator',
    photo: PHOTOS[4], photos: [PHOTOS[4]],
    profession: 'Creative Director',
    location: 'London, UK', distanceKm: 7,
    interests: ['Filmmaking', 'Photography', 'Music', 'Art'],
    isOnline: true, isVerified: true, isPremium: false, matchPercent: 91,
  },
  {
    id: '4', name: 'Elena Vasquez', age: 38,
    bio: "Rediscovering life's chapters. Lawyer by day, adventurer by weekend. Ready for genuine connections.",
    category: 'divorced',
    photo: PHOTOS[6], photos: [PHOTOS[6]],
    profession: 'Senior Attorney', company: 'Vasquez & Partners',
    location: 'Miami, USA', distanceKm: 5,
    interests: ['Law', 'Sailing', 'Wine', 'Reading'],
    isOnline: false, isVerified: true, isPremium: true, premiumTier: 'gold', matchPercent: 82,
  },
  {
    id: '5', name: 'Kai Nakamura', age: 22,
    bio: 'CS student @ MIT. Building AI tools for good. NFT artist on the side. Gen Z but make it sophisticated.',
    category: 'young_youth',
    photo: PHOTOS[1], photos: [PHOTOS[1]],
    profession: 'Student & Developer',
    location: 'Boston, USA', distanceKm: 15,
    interests: ['AI/ML', 'Web3', 'Gaming', 'Skateboarding'],
    isOnline: true, isVerified: false, isPremium: false, matchPercent: 76,
  },
  {
    id: '6', name: 'Priya Sharma', age: 30,
    bio: 'VC at Sequoia. Passionate about climate tech and future of work. Runner, reader, occasional chef.',
    category: 'professional',
    photo: PHOTOS[7], photos: [PHOTOS[7], PHOTOS[2]],
    profession: 'Principal, VC', company: 'Sequoia Capital',
    location: 'Palo Alto, USA', distanceKm: 8,
    interests: ['Investing', 'Climate', 'Running', 'Cooking'],
    isOnline: true, isVerified: true, isPremium: true, premiumTier: 'platinum', matchPercent: 89,
  },
  {
    id: '7', name: 'James Okafor', age: 35,
    bio: 'Ex-Google. Building edtech in Lagos. Mentor, speaker, father of two. If you dream of Africa\'s future, let\'s talk.',
    category: 'entrepreneur',
    photo: PHOTOS[9], photos: [PHOTOS[9]],
    profession: 'Founder & CEO', company: 'EduBridge Africa',
    location: 'Lagos, Nigeria', distanceKm: 2,
    interests: ['Edtech', 'Africa', 'Football', 'Mentorship'],
    isOnline: false, isVerified: true, isPremium: true, premiumTier: 'gold', matchPercent: 85,
  },
  {
    id: '8', name: 'Luna Park', age: 25,
    bio: 'Fashion designer turned tech founder. Building sustainable fashion marketplace. Seoul & NY.',
    category: 'creator',
    photo: PHOTOS[8], photos: [PHOTOS[8], PHOTOS[0]],
    profession: 'Co-Founder', company: 'Verdant',
    location: 'Seoul, Korea', distanceKm: 20,
    interests: ['Fashion', 'Sustainability', 'Design', 'Travel'],
    isOnline: true, isVerified: true, isPremium: false, matchPercent: 78,
  },
];

export const CONVERSATIONS: Conversation[] = [
  {
    id: 'c1',
    profile: PROFILES[0],
    lastMessage: "That sounds amazing! Would love to hear more 🚀",
    lastTime: new Date(Date.now() - 1000 * 60 * 5),
    unread: 2,
    messages: [
      { id: 'm1', senderId: 'other', content: "Hey! Loved your profile ✨", timestamp: new Date(Date.now() - 1000 * 60 * 35), seen: true },
      { id: 'm2', senderId: 'current', content: "Thank you! Yours is amazing too. Are you based in SF?", timestamp: new Date(Date.now() - 1000 * 60 * 30), seen: true },
      { id: 'm3', senderId: 'other', content: "Yes! SoMa area. You?", timestamp: new Date(Date.now() - 1000 * 60 * 20), seen: true },
      { id: 'm4', senderId: 'current', content: "Mission district! We should grab coffee sometime ☕", timestamp: new Date(Date.now() - 1000 * 60 * 10), seen: true },
      { id: 'm5', senderId: 'other', content: "That sounds amazing! Would love to hear more 🚀", timestamp: new Date(Date.now() - 1000 * 60 * 5), seen: false },
    ],
  },
  {
    id: 'c2',
    profile: PROFILES[1],
    lastMessage: "Let's grab coffee next week!",
    lastTime: new Date(Date.now() - 1000 * 60 * 60 * 3),
    unread: 0,
    messages: [
      { id: 'm1', senderId: 'other', content: "Really impressed by your work in fintech 💼", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5), seen: true },
      { id: 'm2', senderId: 'current', content: "Thanks! NovaPay's vision is exactly what the market needs right now.", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4), seen: true },
      { id: 'm3', senderId: 'current', content: "Let's grab coffee next week!", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3), seen: true },
    ],
  },
  {
    id: 'c3',
    profile: PROFILES[2],
    lastMessage: "Check out my latest project — just dropped 🎬",
    lastTime: new Date(Date.now() - 1000 * 60 * 60 * 24),
    unread: 1,
    messages: [
      { id: 'm1', senderId: 'other', content: "Your documentary work is incredible!", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 26), seen: true },
      { id: 'm2', senderId: 'current', content: "Would love to collaborate on something. What's your style?", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 25), seen: true },
      { id: 'm3', senderId: 'other', content: "Check out my latest project — just dropped 🎬", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), seen: false },
    ],
  },
];

export const MATCHES = PROFILES.slice(0, 5);

export const CURRENT_USER = {
  id: 'current',
  name: 'Alex Chen',
  age: 29,
  profession: 'Full-Stack Engineer',
  company: 'Stripe',
  location: 'San Francisco, USA',
  photo: PHOTOS[3],
  bio: 'Building the future of payments. Love hiking, specialty coffee, and late-night coding sessions.',
  interests: ['Engineering', 'Coffee', 'Hiking', 'Music'],
  isVerified: true,
  isPremium: true,
  premiumTier: 'gold' as const,
  profileCompletion: 82,
};
