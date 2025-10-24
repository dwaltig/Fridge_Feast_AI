
export interface Meal {
  name: string;
  description: string;
  ingredients: string[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}
