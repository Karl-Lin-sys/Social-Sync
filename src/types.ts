export type Platform = 'linkedin' | 'twitter' | 'instagram';

export interface PostContent {
  text: string;
  imagePrompt: string;
  imageUrl?: string;
  loadingImage?: boolean;
  error?: string;
}

export interface GeneratedContent {
  linkedin: PostContent;
  twitter: PostContent;
  instagram: PostContent;
}
