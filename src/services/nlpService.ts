import natural from 'natural';
import compromise from 'compromise';
import Sentiment from 'sentiment';
import { OpenAI } from 'openai';
import { TaskPriority, TaskCategory, AIMetadata } from '@/models/Todo';

// Initialize NLP tools
const sentiment = new Sentiment();
const tokenizer = new natural.WordTokenizer();
const stemmer = natural.PorterStemmer;

// Initialize OpenAI (optional)
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

export interface ParsedTaskInfo {
  title: string;
  description?: string;
  priority: TaskPriority;
  category?: TaskCategory;
  dueDate?: Date;
  tags: string[];
  confidenceScore: number;
  extractedEntities: Record<string, any>;
  estimatedDuration?: number;
  complexityScore: number;
}

export class NLPService {
  private priorityKeywords = {
    [TaskPriority.URGENT]: [
      'urgent', 'asap', 'immediately', 'critical', 'emergency', 'now',
      'deadline today', 'overdue', 'crisis'
    ],
    [TaskPriority.HIGH]: [
      'important', 'priority', 'high', 'soon', 'deadline', 'crucial',
      'significant', 'major', 'key'
    ],
    [TaskPriority.LOW]: [
      'when possible', 'eventually', 'someday', 'maybe', 'if time permits',
      'low priority', 'minor', 'optional', 'nice to have'
    ],
  };

  private categoryKeywords = {
    [TaskCategory.WORK]: [
      'work', 'office', 'meeting', 'project', 'client', 'deadline',
      'presentation', 'report', 'email', 'call', 'conference', 'team'
    ],
    [TaskCategory.PERSONAL]: [
      'personal', 'family', 'friend', 'home', 'house', 'self',
      'hobby', 'relationship', 'social'
    ],
    [TaskCategory.HEALTH]: [
      'doctor', 'appointment', 'exercise', 'gym', 'health', 'medical',
      'dentist', 'checkup', 'medication', 'therapy', 'wellness'
    ],
    [TaskCategory.FINANCE]: [
      'bank', 'payment', 'bill', 'money', 'budget', 'tax', 'invoice',
      'financial', 'investment', 'savings', 'loan'
    ],
    [TaskCategory.EDUCATION]: [
      'study', 'learn', 'course', 'book', 'research', 'homework',
      'education', 'training', 'skill', 'knowledge'
    ],
    [TaskCategory.SHOPPING]: [
      'buy', 'purchase', 'shop', 'store', 'grocery', 'mall',
      'order', 'shopping', 'market'
    ],
    [TaskCategory.TRAVEL]: [
      'travel', 'trip', 'flight', 'hotel', 'vacation', 'book',
      'journey', 'visit', 'destination'
    ],
  };

  private durationKeywords = {
    quick: 15,
    fast: 20,
    short: 30,
    medium: 60,
    long: 120,
    detailed: 180,
    comprehensive: 240,
  };

  async parseNaturalLanguageTask(text: string): Promise<ParsedTaskInfo> {
    try {
      // Clean and normalize text
      const cleanText = this.cleanText(text);
      
      // Extract basic information
      const title = this.extractTitle(cleanText);
      const description = this.extractDescription(cleanText);
      const dueDate = this.extractDueDate(cleanText);
      const priority = this.determinePriority(cleanText);
      const category = this.determineCategory(cleanText);
      const tags = this.extractTags(cleanText);
      const entities = this.extractEntities(cleanText);
      const estimatedDuration = this.estimateDuration(cleanText);
      const complexityScore = this.calculateComplexity(cleanText);
      
      // Calculate confidence score
      const confidenceScore = this.calculateConfidence(cleanText, {
        title,
        dueDate,
        priority,
        category,
        tags,
      });

      return {
        title,
        description,
        priority,
        category,
        dueDate,
        tags,
        confidenceScore,
        extractedEntities: entities,
        estimatedDuration,
        complexityScore,
      };
    } catch (error) {
      console.error('Error parsing natural language task:', error);
      
      // Return fallback result
      return {
        title: text.substring(0, 100),
        priority: TaskPriority.MEDIUM,
        tags: [],
        confidenceScore: 0.1,
        extractedEntities: {},
        complexityScore: 0.3,
      };
    }
  }

  private cleanText(text: string): string {
    // Remove common task prefixes
    const prefixes = [
      /^(todo|task|reminder|note|do|need to|have to|must|should):\s*/i,
      /^(add|create|make|schedule|plan)\s+/i,
      /^(i need to|i have to|i must|i should)\s+/i,
    ];

    let cleaned = text.trim();
    for (const prefix of prefixes) {
      cleaned = cleaned.replace(prefix, '');
    }

    return cleaned;
  }

  private extractTitle(text: string): string {
    // Use compromise to extract the main sentence
    const doc = compromise(text);
    const sentences = doc.sentences().out('array');
    
    if (sentences.length > 0) {
      return sentences[0].substring(0, 255).trim();
    }
    
    // Fallback: use first line or up to first period
    const firstLine = text.split('\n')[0].split('.')[0];
    return firstLine.substring(0, 255).trim();
  }

  private extractDescription(text: string): string | undefined {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    if (sentences.length > 1) {
      return sentences.slice(1).join('. ').trim();
    }
    
    return undefined;
  }

  private extractDueDate(text: string): Date | undefined {
    const now = new Date();
    const lowerText = text.toLowerCase();

    // Date patterns with handlers
    const patterns = [
      {
        regex: /\b(today|tonight)\b/,
        handler: () => {
          const date = new Date(now);
          date.setHours(23, 59, 59, 999);
          return date;
        }
      },
      {
        regex: /\btomorrow\b/,
        handler: () => {
          const date = new Date(now);
          date.setDate(date.getDate() + 1);
          date.setHours(23, 59, 59, 999);
          return date;
        }
      },
      {
        regex: /\bnext week\b/,
        handler: () => {
          const date = new Date(now);
          date.setDate(date.getDate() + 7);
          return date;
        }
      },
      {
        regex: /\bin (\d+) days?\b/,
        handler: (match: RegExpMatchArray) => {
          const days = parseInt(match[1]);
          const date = new Date(now);
          date.setDate(date.getDate() + days);
          return date;
        }
      },
      {
        regex: /\bin (\d+) weeks?\b/,
        handler: (match: RegExpMatchArray) => {
          const weeks = parseInt(match[1]);
          const date = new Date(now);
          date.setDate(date.getDate() + (weeks * 7));
          return date;
        }
      },
      {
        regex: /\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/,
        handler: (match: RegExpMatchArray) => {
          const month = parseInt(match[1]) - 1; // JS months are 0-indexed
          const day = parseInt(match[2]);
          let year = parseInt(match[3]);
          if (year < 100) year += 2000;
          return new Date(year, month, day, 23, 59, 59, 999);
        }
      },
    ];

    for (const pattern of patterns) {
      const match = lowerText.match(pattern.regex);
      if (match) {
        try {
          return pattern.handler(match);
        } catch (error) {
          console.warn('Error parsing date:', error);
          continue;
        }
      }
    }

    return undefined;
  }

  private determinePriority(text: string): TaskPriority {
    const lowerText = text.toLowerCase();
    
    // Check for priority keywords
    for (const [priority, keywords] of Object.entries(this.priorityKeywords)) {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        return priority as TaskPriority;
      }
    }

    return TaskPriority.MEDIUM;
  }

  private determineCategory(text: string): TaskCategory | undefined {
    const lowerText = text.toLowerCase();
    
    // Score each category based on keyword matches
    const categoryScores: Record<string, number> = {};
    
    for (const [category, keywords] of Object.entries(this.categoryKeywords)) {
      categoryScores[category] = keywords.reduce((score, keyword) => {
        return score + (lowerText.includes(keyword) ? 1 : 0);
      }, 0);
    }

    // Find the category with the highest score
    const bestCategory = Object.entries(categoryScores)
      .reduce((best, [category, score]) => 
        score > best.score ? { category, score } : best,
        { category: '', score: 0 }
      );

    return bestCategory.score > 0 ? bestCategory.category as TaskCategory : undefined;
  }

  private extractTags(text: string): string[] {
    const tags: string[] = [];
    
    // Extract hashtags
    const hashtags = text.match(/#(\w+)/g);
    if (hashtags) {
      tags.push(...hashtags.map(tag => tag.substring(1).toLowerCase()));
    }

    // Extract important nouns using compromise
    const doc = compromise(text);
    const nouns = doc.nouns().out('array');
    
    // Filter and add relevant nouns as tags
    const relevantNouns = nouns
      .filter(noun => noun.length > 2 && !['task', 'todo', 'thing', 'item'].includes(noun.toLowerCase()))
      .map(noun => noun.toLowerCase())
      .slice(0, 5); // Limit to 5 tags

    tags.push(...relevantNouns);

    return [...new Set(tags)]; // Remove duplicates
  }

  private extractEntities(text: string): Record<string, any> {
    const doc = compromise(text);
    const entities: Record<string, any> = {};

    // Extract people
    const people = doc.people().out('array');
    if (people.length > 0) entities.people = people;

    // Extract places
    const places = doc.places().out('array');
    if (places.length > 0) entities.places = places;

    // Extract organizations
    const organizations = doc.organizations().out('array');
    if (organizations.length > 0) entities.organizations = organizations;

    // Extract dates
    const dates = doc.dates().out('array');
    if (dates.length > 0) entities.dates = dates;

    // Extract times
    const times = doc.times().out('array');
    if (times.length > 0) entities.times = times;

    return entities;
  }

  private estimateDuration(text: string): number {
    const lowerText = text.toLowerCase();
    
    // Check for explicit duration keywords
    for (const [keyword, duration] of Object.entries(this.durationKeywords)) {
      if (lowerText.includes(keyword)) {
        return duration;
      }
    }

    // Estimate based on text complexity
    const wordCount = tokenizer.tokenize(text)?.length || 0;
    const sentenceCount = text.split(/[.!?]+/).length;
    
    // Base duration calculation
    let baseDuration = 30; // 30 minutes default
    
    // Adjust based on word count
    if (wordCount > 20) baseDuration += 30;
    if (wordCount > 50) baseDuration += 60;
    
    // Adjust based on sentence complexity
    if (sentenceCount > 3) baseDuration += 30;
    
    // Check for complexity indicators
    const complexKeywords = [
      'research', 'analyze', 'design', 'develop', 'create', 'write',
      'plan', 'strategy', 'comprehensive', 'detailed', 'thorough'
    ];
    
    const hasComplexKeywords = complexKeywords.some(keyword => 
      lowerText.includes(keyword)
    );
    
    if (hasComplexKeywords) baseDuration *= 2;
    
    return Math.min(baseDuration, 480); // Cap at 8 hours
  }

  private calculateComplexity(text: string): number {
    const lowerText = text.toLowerCase();
    let complexity = 0.3; // Base complexity
    
    // Text length factor
    const wordCount = tokenizer.tokenize(text)?.length || 0;
    complexity += Math.min(wordCount * 0.01, 0.3);
    
    // Sentence structure complexity
    const sentenceCount = text.split(/[.!?]+/).length;
    complexity += Math.min(sentenceCount * 0.05, 0.2);
    
    // Complex action words
    const complexActions = [
      'analyze', 'research', 'develop', 'design', 'implement',
      'coordinate', 'manage', 'optimize', 'integrate', 'evaluate'
    ];
    
    const complexActionCount = complexActions.filter(action => 
      lowerText.includes(action)
    ).length;
    
    complexity += complexActionCount * 0.1;
    
    return Math.min(complexity, 1.0);
  }

  private calculateConfidence(
    text: string, 
    extracted: Partial<ParsedTaskInfo>
  ): number {
    let confidence = 0.5; // Base confidence
    
    // Boost for clear structure
    if (text.split(' ').length > 3) confidence += 0.1;
    
    // Boost for extracted due date
    if (extracted.dueDate) confidence += 0.2;
    
    // Boost for clear title
    if (extracted.title && extracted.title.split(' ').length >= 2) {
      confidence += 0.1;
    }
    
    // Boost for category detection
    if (extracted.category) confidence += 0.1;
    
    // Boost for tags
    if (extracted.tags && extracted.tags.length > 0) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }

  async analyzeSentiment(text: string): Promise<number> {
    try {
      const result = sentiment.analyze(text);
      // Normalize score to -1 to 1 range
      const normalizedScore = Math.max(-1, Math.min(1, result.score / 10));
      return normalizedScore;
    } catch (error) {
      console.error('Error analyzing sentiment:', error);
      return 0;
    }
  }

  async generateAIMetadata(text: string, parsedInfo: ParsedTaskInfo): Promise<AIMetadata> {
    const sentimentScore = await this.analyzeSentiment(text);
    
    return {
      confidenceScore: parsedInfo.confidenceScore,
      extractedEntities: parsedInfo.extractedEntities,
      sentimentScore,
      keywords: parsedInfo.tags,
      suggestedTags: parsedInfo.tags,
      processingTimestamp: new Date(),
      nlpVersion: '1.0.0',
      modelUsed: 'natural + compromise',
    };
  }

  // Enhanced AI processing with OpenAI (if available)
  async enhanceWithOpenAI(text: string): Promise<Partial<ParsedTaskInfo>> {
    if (!openai) {
      return {};
    }

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `You are a task analysis AI. Analyze the given task and extract:
            1. A clear, concise title (max 100 chars)
            2. Priority level (low, medium, high, urgent)
            3. Category (work, personal, health, finance, education, shopping, travel, other)
            4. Estimated duration in minutes
            5. Key tags (max 5)
            
            Respond in JSON format only.`
          },
          {
            role: "user",
            content: text
          }
        ],
        max_tokens: 200,
        temperature: 0.3,
      });

      const response = completion.choices[0]?.message?.content;
      if (response) {
        return JSON.parse(response);
      }
    } catch (error) {
      console.error('OpenAI enhancement error:', error);
    }

    return {};
  }
}
