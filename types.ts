export interface OrcidWork {
  title: string;
  year: number | null;
  type: string;
  journal?: string;
  doi?: string;
  putCode: string; // Unique ID in ORCID
}

export interface OrcidProfileData {
  orcidId: string;
  fullName: string;
  works: OrcidWork[];
}

export interface AnalysisStats {
  totalResearchers: number;
  totalPublications: number;
  avgPublications: number;
  publicationsByYear: { year: number; count: number }[];
  publicationsByType: { type: string; count: number }[];
  processedProfiles: OrcidProfileData[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  isThinking?: boolean;
}