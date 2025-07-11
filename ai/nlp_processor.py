"""
AI-Enhanced Natural Language Processing for Todo Management
"""
import re
import spacy
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
from transformers import pipeline
import openai
from models.todo import TaskPriority, TaskCategory, AIMetadata
import logging

logger = logging.getLogger(__name__)


@dataclass
class ParsedTaskInfo:
    """Structured information extracted from natural language input"""
    title: str
    description: Optional[str] = None
    priority: TaskPriority = TaskPriority.MEDIUM
    category: Optional[TaskCategory] = None
    due_date: Optional[datetime] = None
    tags: List[str] = None
    confidence_score: float = 0.0
    extracted_entities: Dict[str, Any] = None

    def __post_init__(self):
        if self.tags is None:
            self.tags = []
        if self.extracted_entities is None:
            self.extracted_entities = {}


class NLPProcessor:
    """Advanced NLP processor for AI-enhanced task creation"""
    
    def __init__(self, openai_api_key: Optional[str] = None):
        self.nlp = None
        self.sentiment_analyzer = None
        self.openai_client = None
        self._initialize_models()
        
        if openai_api_key:
            openai.api_key = openai_api_key
            self.openai_client = openai.OpenAI(api_key=openai_api_key)
    
    def _initialize_models(self):
        """Initialize NLP models"""
        try:
            # Load spaCy model
            self.nlp = spacy.load("en_core_web_sm")
            
            # Initialize sentiment analyzer
            self.sentiment_analyzer = pipeline(
                "sentiment-analysis",
                model="cardiffnlp/twitter-roberta-base-sentiment-latest"
            )
            
            logger.info("NLP models initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize NLP models: {e}")
            raise
    
    async def parse_natural_language_task(self, text: str) -> ParsedTaskInfo:
        """
        Parse natural language input to extract task information
        """
        try:
            # Process with spaCy
            doc = self.nlp(text)
            
            # Extract basic information
            title = self._extract_title(text, doc)
            description = self._extract_description(text, doc)
            due_date = self._extract_due_date(text, doc)
            priority = self._determine_priority(text, doc)
            category = self._determine_category(text, doc)
            tags = self._extract_tags(text, doc)
            entities = self._extract_entities(doc)
            
            # Calculate confidence score
            confidence = self._calculate_confidence(text, doc, title, due_date)
            
            return ParsedTaskInfo(
                title=title,
                description=description,
                priority=priority,
                category=category,
                due_date=due_date,
                tags=tags,
                confidence_score=confidence,
                extracted_entities=entities
            )
            
        except Exception as e:
            logger.error(f"Error parsing natural language task: {e}")
            # Return basic fallback
            return ParsedTaskInfo(
                title=text[:100] if len(text) > 100 else text,
                confidence_score=0.1
            )
    
    def _extract_title(self, text: str, doc) -> str:
        """Extract task title from text"""
        # Remove common task prefixes
        prefixes = [
            r"^(todo|task|reminder|note|do|need to|have to|must|should):\s*",
            r"^(add|create|make|schedule|plan)\s+",
            r"^(i need to|i have to|i must|i should)\s+"
        ]
        
        cleaned_text = text.strip()
        for prefix in prefixes:
            cleaned_text = re.sub(prefix, "", cleaned_text, flags=re.IGNORECASE)
        
        # Extract first sentence or up to first period/newline
        sentences = [sent.text.strip() for sent in doc.sents]
        if sentences:
            title = sentences[0]
        else:
            title = cleaned_text.split('\n')[0].split('.')[0]
        
        return title[:255].strip()  # Limit to 255 characters
    
    def _extract_description(self, text: str, doc) -> Optional[str]:
        """Extract detailed description from text"""
        sentences = [sent.text.strip() for sent in doc.sents]
        if len(sentences) > 1:
            return " ".join(sentences[1:])
        return None
    
    def _extract_due_date(self, text: str, doc) -> Optional[datetime]:
        """Extract due date from text using various patterns"""
        # Date patterns
        date_patterns = [
            (r"(today|tonight)", lambda: datetime.now().replace(hour=23, minute=59)),
            (r"tomorrow", lambda: datetime.now() + timedelta(days=1)),
            (r"next week", lambda: datetime.now() + timedelta(weeks=1)),
            (r"next month", lambda: datetime.now() + timedelta(days=30)),
            (r"in (\d+) days?", lambda m: datetime.now() + timedelta(days=int(m.group(1)))),
            (r"in (\d+) weeks?", lambda m: datetime.now() + timedelta(weeks=int(m.group(1)))),
            (r"by (\d{1,2})/(\d{1,2})", self._parse_date_mm_dd),
            (r"(\d{1,2})/(\d{1,2})/(\d{2,4})", self._parse_date_full),
        ]
        
        text_lower = text.lower()
        for pattern, handler in date_patterns:
            match = re.search(pattern, text_lower)
            if match:
                try:
                    if callable(handler):
                        if match.groups():
                            return handler(match)
                        else:
                            return handler()
                    else:
                        return handler
                except Exception as e:
                    logger.warning(f"Error parsing date pattern {pattern}: {e}")
                    continue
        
        # Use spaCy's date entity recognition
        for ent in doc.ents:
            if ent.label_ in ["DATE", "TIME"]:
                try:
                    # This is a simplified approach - in production, use a more robust date parser
                    return self._parse_spacy_date(ent.text)
                except:
                    continue
        
        return None
    
    def _parse_date_mm_dd(self, match) -> datetime:
        """Parse MM/DD format"""
        month, day = int(match.group(1)), int(match.group(2))
        year = datetime.now().year
        return datetime(year, month, day, 23, 59)
    
    def _parse_date_full(self, match) -> datetime:
        """Parse MM/DD/YYYY format"""
        month, day, year = int(match.group(1)), int(match.group(2)), int(match.group(3))
        if year < 100:
            year += 2000
        return datetime(year, month, day, 23, 59)
    
    def _parse_spacy_date(self, date_text: str) -> Optional[datetime]:
        """Parse date text using simple heuristics"""
        # This is a placeholder - implement more sophisticated date parsing
        return None
    
    def _determine_priority(self, text: str, doc) -> TaskPriority:
        """Determine task priority based on text analysis"""
        text_lower = text.lower()
        
        # High priority indicators
        urgent_keywords = [
            "urgent", "asap", "immediately", "critical", "emergency",
            "important", "priority", "deadline", "due today"
        ]
        
        # Low priority indicators
        low_keywords = [
            "when possible", "eventually", "someday", "maybe",
            "if time permits", "low priority"
        ]
        
        if any(keyword in text_lower for keyword in urgent_keywords):
            return TaskPriority.URGENT if "urgent" in text_lower or "asap" in text_lower else TaskPriority.HIGH
        
        if any(keyword in text_lower for keyword in low_keywords):
            return TaskPriority.LOW
        
        return TaskPriority.MEDIUM
    
    def _determine_category(self, text: str, doc) -> Optional[TaskCategory]:
        """Determine task category based on content analysis"""
        text_lower = text.lower()
        
        category_keywords = {
            TaskCategory.WORK: ["work", "office", "meeting", "project", "client", "deadline", "presentation"],
            TaskCategory.PERSONAL: ["personal", "family", "friend", "home", "house"],
            TaskCategory.HEALTH: ["doctor", "appointment", "exercise", "gym", "health", "medical"],
            TaskCategory.FINANCE: ["bank", "payment", "bill", "money", "budget", "tax"],
            TaskCategory.EDUCATION: ["study", "learn", "course", "book", "research", "homework"],
            TaskCategory.SHOPPING: ["buy", "purchase", "shop", "store", "grocery"],
            TaskCategory.TRAVEL: ["travel", "trip", "flight", "hotel", "vacation", "book"]
        }
        
        for category, keywords in category_keywords.items():
            if any(keyword in text_lower for keyword in keywords):
                return category
        
        return None
    
    def _extract_tags(self, text: str, doc) -> List[str]:
        """Extract relevant tags from text"""
        tags = []
        
        # Extract hashtags
        hashtags = re.findall(r'#(\w+)', text)
        tags.extend(hashtags)
        
        # Extract important nouns and proper nouns
        for token in doc:
            if token.pos_ in ["NOUN", "PROPN"] and len(token.text) > 2:
                if token.text.lower() not in ["task", "todo", "thing", "item"]:
                    tags.append(token.text.lower())
        
        return list(set(tags))[:10]  # Limit to 10 unique tags
    
    def _extract_entities(self, doc) -> Dict[str, Any]:
        """Extract named entities from text"""
        entities = {}
        for ent in doc.ents:
            if ent.label_ not in entities:
                entities[ent.label_] = []
            entities[ent.label_].append(ent.text)
        
        return entities
    
    def _calculate_confidence(self, text: str, doc, title: str, due_date: Optional[datetime]) -> float:
        """Calculate confidence score for the parsing"""
        score = 0.5  # Base score
        
        # Boost for clear structure
        if len(text.split()) > 3:
            score += 0.1
        
        # Boost for extracted due date
        if due_date:
            score += 0.2
        
        # Boost for clear title
        if title and len(title.split()) >= 2:
            score += 0.1
        
        # Boost for entities found
        if doc.ents:
            score += 0.1
        
        return min(score, 1.0)
    
    async def analyze_sentiment(self, text: str) -> float:
        """Analyze sentiment of the task text"""
        try:
            if self.sentiment_analyzer:
                result = self.sentiment_analyzer(text)[0]
                # Convert to -1 to 1 scale
                if result['label'] == 'POSITIVE':
                    return result['score']
                elif result['label'] == 'NEGATIVE':
                    return -result['score']
                else:
                    return 0.0
        except Exception as e:
            logger.error(f"Error analyzing sentiment: {e}")
        
        return 0.0
    
    async def generate_ai_metadata(self, text: str, parsed_info: ParsedTaskInfo) -> AIMetadata:
        """Generate comprehensive AI metadata for a task"""
        sentiment_score = await self.analyze_sentiment(text)
        
        return AIMetadata(
            confidence_score=parsed_info.confidence_score,
            extracted_entities=parsed_info.extracted_entities,
            sentiment_score=sentiment_score,
            keywords=parsed_info.tags,
            suggested_tags=parsed_info.tags,
            processing_timestamp=datetime.utcnow()
        )
