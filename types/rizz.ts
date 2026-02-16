export interface RizzResponse {
  id: string;
  input_text: string;
  tone: string;
  category: string;
  response_1: string;
  response_2: string;
  response_3: string;
  selected_idx: number;
  created_at: string;
}

export interface RizzStats {
  current_streak: number;
  longest_streak: number;
  total_rizzes: number;
  free_uses_today: number;
}

export const TONES = [
  { id: 'flirty', label: 'Flirty', emoji: '😏', color: '#ec4899' },
  { id: 'professional', label: 'Professional', emoji: '💼', color: '#3b82f6' },
  { id: 'funny', label: 'Funny', emoji: '😂', color: '#fbbf24' },
  { id: 'chill', label: 'Chill', emoji: '😎', color: '#22c55e' },
  { id: 'savage', label: 'Savage', emoji: '💅', color: '#ef4444' },
  { id: 'romantic', label: 'Romantic', emoji: '❤️', color: '#f43f5e' },
  { id: 'confident', label: 'Confident', emoji: '💪', color: '#8b5cf6' },
  { id: 'mysterious', label: 'Mysterious', emoji: '🌙', color: '#1f2937' },
];

export const CATEGORIES = [
  { id: 'dating', label: 'Dating', emoji: '💕' },
  { id: 'work', label: 'Work', emoji: '💼' },
  { id: 'casual', label: 'Casual', emoji: '💬' },
  { id: 'family', label: 'Family', emoji: '👨‍👩‍👧' },
  { id: 'friends', label: 'Friends', emoji: '👯' },
];
