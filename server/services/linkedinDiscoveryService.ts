const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;

export interface LinkedInCompany {
  id: string;
  name: string;
  vanityName?: string;
  description?: string;
  logoUrl?: string;
  followerCount?: number;
  industry?: string;
  companySize?: string;
  website?: string;
  linkedinUrl: string;
}

export interface LinkedInPerson {
  id: string;
  firstName: string;
  lastName: string;
  headline?: string;
  profilePictureUrl?: string;
  vanityName?: string;
  linkedinUrl: string;
}

export function isLinkedInDiscoveryConfigured(): boolean {
  return !!(LINKEDIN_CLIENT_ID && LINKEDIN_CLIENT_SECRET);
}

export async function extractLinkedInProfileInfo(profileUrl: string): Promise<LinkedInPerson | null> {
  try {
    const vanityNameMatch = profileUrl.match(/linkedin\.com\/in\/([^\/\?]+)/);
    const companyMatch = profileUrl.match(/linkedin\.com\/company\/([^\/\?]+)/);
    
    if (vanityNameMatch) {
      const vanityName = vanityNameMatch[1];
      return {
        id: vanityName,
        firstName: '',
        lastName: '',
        vanityName,
        linkedinUrl: `https://linkedin.com/in/${vanityName}`,
      };
    }
    
    if (companyMatch) {
      return null;
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting LinkedIn profile info:', error);
    return null;
  }
}

export async function extractLinkedInCompanyInfo(companyUrl: string): Promise<LinkedInCompany | null> {
  try {
    const companyMatch = companyUrl.match(/linkedin\.com\/company\/([^\/\?]+)/);
    
    if (companyMatch) {
      const vanityName = companyMatch[1];
      return {
        id: vanityName,
        name: vanityName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        vanityName,
        linkedinUrl: `https://linkedin.com/company/${vanityName}`,
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting LinkedIn company info:', error);
    return null;
  }
}

export function generateLinkedInSearchSuggestions(query: string): string[] {
  const baseSuggestions = [
    `${query} CEO`,
    `${query} founder`,
    `${query} marketing`,
    `${query} podcast`,
    `${query} influencer`,
    `${query} creator`,
  ];
  
  return baseSuggestions.slice(0, 5);
}

export function getLinkedInSearchUrl(query: string, type: 'people' | 'companies' = 'people'): string {
  const encodedQuery = encodeURIComponent(query);
  if (type === 'companies') {
    return `https://www.linkedin.com/search/results/companies/?keywords=${encodedQuery}`;
  }
  return `https://www.linkedin.com/search/results/people/?keywords=${encodedQuery}`;
}

export function getLinkedInHashtagUrl(hashtag: string): string {
  const cleanHashtag = hashtag.replace(/^#/, '');
  return `https://www.linkedin.com/feed/hashtag/${cleanHashtag}/`;
}
