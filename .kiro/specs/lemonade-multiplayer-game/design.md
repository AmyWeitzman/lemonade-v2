# Technical Design Document: Lemonade Multiplayer Game

## 1. High-Level Architecture

### 1.1 System Architecture Overview

The Lemonade multiplayer game follows a **client-server architecture** with real-time multiplayer capabilities:

- **Frontend**: Single-page web application (SPA) providing responsive UI across desktop, tablet, and mobile devices
- **Backend**: RESTful API server with WebSocket support for real-time multiplayer synchronization
- **Database**: Persistent storage for game state, player profiles, and session data
- **Real-time Layer**: WebSocket server for live updates, notifications, and multiplayer coordination

**Architecture Pattern**: Three-tier architecture
- **Presentation Tier**: React-based SPA with responsive design
- **Application Tier**: Node.js backend with Express.js and Socket.IO
- **Data Tier**: PostgreSQL for relational data with Redis for caching and session management

### 1.2 Technology Stack Recommendations

**Frontend**:
- **Framework**: React 18+ with TypeScript for type safety
- **State Management**: Redux Toolkit for global state, React Query for server state
- **UI Library**: Material-UI (MUI) or Chakra UI for responsive components
- **Real-time**: Socket.IO client for WebSocket connections
- **Routing**: React Router v6 for navigation
- **Charts**: Recharts or Chart.js for data visualization (scrapbook, stats)
- **Animation**: Framer Motion for smooth animations and visual feedback
- **Audio**: Howler.js for sound effects and audio management

**Backend**:
- **Runtime**: Node.js 18+ LTS
- **Framework**: Express.js for REST API
- **Real-time**: Socket.IO for WebSocket server
- **Language**: TypeScript for type safety and maintainability
- **Validation**: Zod or Joi for request validation
- **Authentication**: JWT (JSON Web Tokens) for session management

**Database**:
- **Primary Database**: PostgreSQL 15+ for ACID compliance and complex queries
- **Caching Layer**: Redis for session storage, real-time data, and performance optimization
- **ORM**: Prisma or TypeORM for type-safe database access

**Infrastructure**:
- **Hosting**: Cloud platform (AWS, Google Cloud, or Azure)
- **Container**: Docker for consistent deployment
- **Orchestration**: Docker Compose for development, Kubernetes for production (optional)
- **CDN**: CloudFlare or AWS CloudFront for static asset delivery
- **File Storage**: S3-compatible storage for user-generated content (notes, drawings)

### 1.3 Deployment Architecture

**Development Environment**:
- Local development with Docker Compose
- Hot-reload for frontend and backend
- Local PostgreSQL and Redis instances

**Production Environment**:
- **Load Balancer**: Nginx or cloud load balancer for traffic distribution
- **Application Servers**: Multiple Node.js instances behind load balancer
- **Database**: Managed PostgreSQL with read replicas for scalability
- **Cache**: Redis cluster for high availability
- **WebSocket**: Sticky sessions for WebSocket connections
- **Monitoring**: Application performance monitoring (APM) and logging

**Scalability Considerations**:
- Horizontal scaling of application servers
- Database connection pooling
- Redis for distributed session management
- CDN for static assets
- WebSocket server clustering with Redis adapter

## 2. System Components

### 2.1 Frontend Components

**Core Pages** (with themed names):

1. **Lemonade** (Home/Landing Page): Game instructions, tutorial, create/join game
2. **Squeeze the Day** (Actions): Browse and execute actions, cart management
3. **Harvest** (Finances): Money management, loans, retirement, expenses
4. **Seeds to Trees** (Jobs): Job catalog, application, employment management
5. **Zest for Learning** (Education): College programs, enrollment, academic progress
6. **You Won't Get A 🍋** (Transportation): Vehicle selection and management
7. **Home Sour Home** (Housing): Housing options, home improvements
8. **Lemonade Stand** (Pitcher): Community pitcher visualization, goals, contributions
9. **Life's Lemons** (Scrapbook): End-game summary, statistics, achievements
10. **Tending the Garden** (Profile Drawer): Character stats, skills, traits, family, pets, timeline

**Shared Components**:
- **Navigation Bar**: Health/stress/money display, notifications, mini-pitcher, messaging
- **Profile Panel**: Collapsible sections for skills, traits, finances, family
- **Action Card**: Display action details, requirements, effects
- **Cart System**: Add/remove actions, validate time blocks and costs
- **Notification System**: Toast notifications, persistent alerts
- **Messaging Interface**: Real-time chat with other players
- **Comparison Tool**: Side-by-side comparison for housing/vehicles
- **Filter/Sort Controls**: Dynamic filtering for actions, jobs, housing, vehicles
- **Modal Dialogs**: Confirmations, card reveals, event notifications
- **Progress Bars**: Visual representation of skills, traits, health, stress
- **Time Block Visualizer**: 60-block grid showing allocation

**State Management Structure**:
```typescript
// Global State (Redux)
- authState: { playerId, gameSessionId, token }
- playerState: { profile, skills, traits, health, stress, money, ... }
- gameState: { currentYear, phase, lemonadePitcher, otherPlayers }
- uiState: { notifications, preferences, activeModals }
- cartState: { actions, totalCost, totalTimeBlocks }

// Server State (React Query)
- actions: useQuery(['actions'])
- jobs: useQuery(['jobs'])
- housing: useQuery(['housing'])
- vehicles: useQuery(['vehicles'])
- cards: useQuery(['cards'])
```

### 2.2 Backend Services

**API Services**:

1. **Authentication Service**: Player registration, login, session management
2. **Game Session Service**: Create/join/leave games, session lifecycle
3. **Player Service**: Profile initialization, attribute management, state updates
4. **Action Service**: Action catalog, eligibility checking, execution
5. **Job Service**: Job catalog, application, employment tracking, raises/termination
6. **Education Service**: Program enrollment, academic progress, graduation
7. **Housing Service**: Housing catalog, selection, home improvements
8. **Transportation Service**: Vehicle catalog, purchase/sale, maintenance
9. **Financial Service**: Money management, loans, taxes, retirement, expenses
10. **Relationship Service**: Marriage, divorce, children, adoption, pets
11. **Card Service**: Random event generation, card effects, good deed opportunities
12. **Lemonade Pitcher Service**: Goal calculation, lemon contributions, grace periods
13. **Year Cycle Service**: Year progression, birthday events, aging effects
14. **Health/Stress Service**: Calculation engines for health and stress changes
15. **Notification Service**: Event notifications, reminders, alerts
16. **Career Progression Service**: Writing, acting, music career mechanics
17. **Scrapbook Service**: Statistics tracking, badge calculation, end-game summary

**Game Engine Services**:
1. **Time Block Calculator**: Allocates 60 blocks across sleep, work, childcare, activities
2. **Health Calculator**: Applies aging, stress effects, chronic conditions
3. **Stress Calculator**: Aggregates job, college, debt, card stress
4. **Financial Calculator**: Tax calculation, loan interest, inflation
5. **Eligibility Checker**: Validates action/job/education requirements
6. **Random Event Generator**: Weighted card selection, probability rolls
7. **Inflation Engine**: Applies annual inflation to costs and salaries
8. **Childcare Calculator**: Determines time blocks and costs based on children's ages
9. **Good Deed Multiplier**: Calculates bonuses/penalties for good/bad deeds
10. **Pension Calculator**: Tracks service years and calculates pension payments

### 2.3 Real-time Communication Layer

**WebSocket Events** (Socket.IO):

**Client → Server**:
- `joinGame`: Player joins game session
- `leaveGame`: Player leaves game session
- `executeAction`: Player executes action(s)
- `updateCart`: Player modifies action cart
- `completeYear`: Player finishes year and pays expenses
- `sendMessage`: Player sends chat message
- `respondToGoodDeed`: Player accepts/declines good deed opportunity
- `applyForJob`: Player applies for job
- `enrollInEducation`: Player enrolls in program
- `selectHousing`: Player selects housing
- `selectVehicle`: Player selects vehicle
- `reactToMessage`: Player adds/removes emoji reaction to a message

**Server → Client**:
- `playerJoined`: Notify all players of new player
- `playerLeft`: Notify all players of departure
- `yearStarted`: New year begins for all players
- `lemonAdded`: Lemon contributed to pitcher
- `pitcherUpdated`: Pitcher goal/status changed
- `cardDrawn`: Random card event for player
- `goodDeedOpportunity`: Good deed available for other players
- `notification`: General notification (job loss, graduation, etc.)
- `playerStateChanged`: Another player's state updated
- `messageReceived`: Chat message from another player
- `gameEnded`: Game over (pitcher goal failed or all players deceased)
- `messageReactionUpdated`: Emoji reaction added/removed from message
- `playerDied`: Notify all players when a player dies

**Room Management**:
- Each game session is a Socket.IO room
- Players join room on game connection
- Broadcast events to all players in room
- Handle disconnections and reconnections gracefully

### 2.4 Data Persistence Layer

**Database Strategy**:
- **PostgreSQL** for primary data storage with ACID guarantees
- **Redis** for caching frequently accessed data (action catalog, job catalog)
- **Redis** for session management and WebSocket state
- **Optimistic locking** for concurrent updates to shared resources (lemonade pitcher)

**Caching Strategy**:
- Cache static game data (actions, jobs, housing, vehicles) with TTL
- Cache player state with short TTL, invalidate on updates
- Use Redis pub/sub for cache invalidation across servers
- Cache calculation results (tax brackets, inflation rates)

## 3. Data Models

### 3.1 Core Entities

**Player Profile**:
```typescript
interface Player {
  id: string;
  gameSessionId: string;
  name: string;
  age: number;
  currentYear: number;
  
  // Financial
  money: number;
  projectedIncome: number;
  retirementSavings: number;
  retirementHistory: RetirementTransaction[];
  collegeFund: number;
  loans: Loan[];
  
  // Attributes
  health: number;
  maxHealth: number;
  stress: number;
  skills: Skills;
  traits: Traits;
  
  // Status
  isAlive: boolean;  // When false, player can only access chat and view their game summary
  isRetired: boolean;
  chronicConditions: string[];
  certifications: Certification[];
  
  // Relationships
  maritalStatus: 'single' | 'married' | 'divorced';
  spouseId?: string;
  children: Child[];
  pets: Pet[];
  
  // Possessions
  currentHousingId: string;
  housingHistory: HousingOwnership[];
  currentVehicleIds: string[];
  vehicleHistory: VehicleOwnership[];
  homeImprovements: HomeImprovement[];
  
  // Employment & Education
  jobs: Employment[];
  education: Education[];
  
  // Game Progress
  yearComplete: boolean;
  totalLemonsEarned: number;
  goodDeedCount: number;
  badDeedCount: number;
  cardsReceivedThisYear: number;
  actionHistory: ActionHistory[];
  
  // Parent Contributions (initial)
  parentContributions: ParentContributions;
  
  createdAt: Date;
  updatedAt: Date;
}
```

**Skills & Traits**:
```typescript
interface Skills {
  math: number;
  science: number;
  art: number;
  music: number;
  writing: number;
  analysis: number;
  homeRepair: number;
  technology: number;
}

interface Traits {
  bravery: number;
  perseverance: number;
  charisma: number;
  compassion: number;
  creativity: number;
  organization: number;
  patience: number;
  caution: number;
  sociability: number;
  stressTolerance: number;
  goodWithKids: number;
  physicalAbility: number;
  communication: number;
}
```

**Game Session**:
```typescript
interface GameSession {
  id: string;
  hostPlayerId: string;
  theme: string; // 'default', future themes
  
  // State
  currentYear: number;
  status: 'waiting' | 'active' | 'ended';
  endReason?: 'pitcher_failed' | 'all_deceased' | 'player_ended';
  
  // Players
  playerIds: string[];
  maxPlayers: number;
  
  // Lemonade Pitcher
  lemonadePitcher: LemonadePitcher;
  
  // Inflation tracking
  inflationRates: InflationRates;
  taxBrackets: TaxBracket[];
  
  createdAt: Date;
  updatedAt: Date;
}
```

**Lemonade Pitcher**:
```typescript
interface LemonadePitcher {
  currentLemons: number;
  yearlyGoal: number;
  totalCapacity: number;
  graceYearUsed: boolean;
  contributionsByPlayer: Record<string, number>; // playerId -> total lemons
  yearlyContributions: Record<number, number>; // year -> lemons that year
}
```

### 3.2 Action System

**Action**:
```typescript
interface Action {
  id: string;
  name: string;
  category: 'mental-health' | 'physical-health' | 'social' | 'family' | 'entertainment' | 'outdoors' | 'animals' | 'education' | 'schoolwork' | 'skill-trait' | 'luxury' | 'home-auto' | 'community' | 'career' | 'other';
  description: string;
  
  // Requirements
  requirements: {
    minAge?: number;
    maxAge?: number;
    skills?: Partial<Skills>;
    traits?: Partial<Traits>;
    minHealth?: number;
    certifications?: string[];
    enrolled?: boolean;
    hasPool?: boolean;
    location?: 'city' | 'suburb' | 'both';
    other?: string[]; // custom requirements
  };
  
  // Costs
  baseCost: number;
  costPerPerson?: number;
  costPerTimeBlock?: number;
  seniorDiscount: boolean; // 65+
  
  // Time
  timeBlocks: number;
  requiresPTO: boolean;
  
  // Effects
effects: {
  lemons: number;
  healthTemporary?: number;      // Temporary health change
  healthPermanent?: number;      // Permanent health change
  stress: number;
  skills?: Partial<Skills>;
  traits?: Partial<Traits>;
  goodDeedMultiplier?: boolean;
};
  
  // Execution
  executionType: 'express' | 'cart';
  frequency: 'once_per_year' | 'multiple' | 'unlimited';
  
  // Job-specific discounts
  jobDiscounts?: Record<string, number>; // jobId -> discount percentage
}
```

**Action History**:
```typescript
interface ActionHistory {
  actionId: string;
  year: number;
  count: number;
  totalCost: number;
  totalTimeBlocks: number;
  lemonsEarned: number;
}
```

### 3.3 Employment System

**Job**:
```typescript
interface Job {
  id: string;
  title: string;
  
  // Requirements
  requirements: {
    education?: string[]; // degree types
    skills?: Partial<Skills>;
    traits?: Partial<Traits>;
    minHealth?: number;
    certifications?: string[];
    location?: 'city' | 'suburb' | 'both';
  };
  
  // Compensation
  baseSalary: number;
  raiseSchedule: {
    years: number;
    percentage: number;
  }[];
  hasPension: boolean;
  pensionPercentage?: number;
  
  // Time & Stress
  timeBlocks: number;
  stressLevel: number;
  ptoDays: number;
  unpaidTimeOff?: number; // time blocks
  
  // Employment type
  fullTime: boolean;
  partTime: boolean;
  seasonal: boolean;
  
  // Benefits & Perks
  benefits: {
    type: string; // 'gym_waiver', 'travel_discount', etc.
    value: any;
  }[];
  
  // Skill/Trait gains
  annualGains: {
    skills?: Partial<Skills>;
    traits?: Partial<Traits>;
  };
}
```

**Employment Record**:
```typescript
interface Employment {
  jobId: string;
  startAge: number;
  timeBlocksWorked: number;
  currentSalary: number;
  yearsOfService: number;
  ptoRemaining: number;
  isActive: boolean;
  isPartTime: boolean;
  isSeasonal: boolean;
  endAge?: number;
  endReason?: 'quit' | 'fired_performance' | 'fired_health' | 'retired';
}
```

### 3.4 Education System

**Education Program**:
```typescript
interface EducationProgram {
  id: string;
  name: string;
  type: 'associates' | 'bachelors' | 'masters' | 'doctorate' | 'certificate';
  field: string;
  
  // Requirements
  requirements: {
    skills?: Partial<Skills>;
    traits?: Partial<Traits>;
    prerequisiteDegrees?: string[];
  };
  
  // Costs
  tuitionFullTime: number;
  tuitionPartTime: number;
  
  // Curriculum
  totalCredits: {
    generalEducation: number;
    field: number;
    major: number;
  };
  
  // Skill gains
  skillGains: {
    automatic: Partial<Skills>; // per year
    major: Partial<Skills>; // per year
  };
  
  // Stress
  stressLevel: number;
  isStem: boolean; // higher stress
}
```

**Education Record**:
```typescript
interface Education {
  programId: string;
  isPartTime: boolean;
  startAge: number;
  
  // Progress
  creditsCompleted: {
    generalEducation: number;
    field: number;
    major: number;
  };
  
  // Status
  isActive: boolean;
  graduated: boolean;
  graduationAge?: number;
  
  // Funding
  scholarships: Scholarship[];
  parentContributionUsed: number;
}
```

### 3.5 Housing & Transportation

**Housing**:
```typescript
interface Housing {
  id: string;
  name: string;
  type: 'parent' | 'dorm' | 'apartment' | 'house';
  location: 'city' | 'suburb';
  
  // Costs
  isRental: boolean;
  rentPerYear?: number;
  purchasePrice?: number;
  utilitiesBase: number;
  utilitiesPerPerson: number;
  insurancePerYear?: number; // if owned
  
  // Capacity
  recommendedOccupancy: number;
  maxOccupancy: number;
  petLimit: number;
  
  // Restrictions
  ageLimit?: number; // parent housing
  requiresEnrollment?: boolean; // dorm
  
  // Improvements (if owned)
  allowsRemodeling: boolean;
  allowsPool: boolean;
  allowsSolarPanels: boolean;
}
```

**Housing Ownership** (tracking history):
```typescript
interface HousingOwnership {
  housingId: string;
  startAge: number;
  endAge?: number;
  isRental: boolean;
  purchasePrice?: number;
  salePrice?: number;
  totalRentPaid?: number;
  improvements: HomeImprovement[];
  yearsLived: number;
}
```

**Vehicle**:
```typescript
interface Vehicle {
  id: string;
  name: string;
  type: 'bike' | 'public_transit' | 'car' | 'motorcycle';
  fuelType: 'none' | 'gas' | 'electric' | 'hybrid';
  
  // Costs
  purchasePrice?: number;
  annualCost?: number; // public transit
  insuranceBase: number;
  gasPerYear: number;
  maintenanceBase: number;
  
  // Capacity
  passengerCapacity: number;
  
  // Restrictions
  restrictedToArea: boolean; // bike can't travel between city/suburb
  
  // Parent contribution
  canBeParentGift: boolean;
}
```

**Vehicle Ownership** (tracking history):
```typescript
interface VehicleOwnership {
  vehicleId: string;
  startAge: number;
  endAge?: number;
  purchasePrice?: number;
  salePrice?: number;
  wasParentGift: boolean;
  totalMaintenancePaid: number;
  totalInsurancePaid: number;
  yearsOwned: number;
}
```

**Home Improvement**:
```typescript
interface HomeImprovement {
  type: 'remodel' | 'pool' | 'solar_panels';
  year: number;
  cost: number;
  valueIncrease: number;
  annualCost?: number; // pool maintenance
  annualBenefit?: number; // solar panel savings or lemons
}
```

### 3.6 Relationships & Family

**Spouse**:
```typescript
interface Spouse {
  age: number;
  
  // Employment
  jobId?: string;
  salary: number;
  isJobPartTime: boolean;
  
  // Education
  educationProgramId?: string;
  isEduPartTime: boolean;
  
  // Possessions
  vehicleId?: string;
  housingId?: string;
  loans: Loan[];
  
  // Financial (tracked at marriage for divorce calculations)
  originalMoney: number;
  originalSavings: number;
  originalLoans: number;
  
  // Status
  isRetired: boolean;
  certifications: string[];
}
```

**Dating App Candidate** (temporary, generated for Find Love action):
```typescript
interface DatingCandidate {
  // Demographics
  age: number; // same as player
  
  // Employment
  jobId?: string;
  jobTitle: string;
  salary: number;
  pto: number;
  isRetired: boolean; // if player age > 65
  
  // Education
  educationLevel: 'none' | 'high_school' | 'associates' | 'bachelors' | 'masters' | 'phd';
  educationInterest: string; // major/field
  
  // Financial
  money: number; // includes loans
  retirementSavings: number;
  loans: number;
  
  // Possessions
  vehicleType: string;
  housingType: string;
  
  // Compatibility
  initialCompatibilityScore: number; // 0-12 range
  
  // Metadata
  matchesCriteria: string[]; // which player criteria this candidate matches
}
```

**Marriage Compatibility Tracking**:
```typescript
interface MarriageCompatibility {
  playerId: string;
  currentScore: number;
  yearlyScores: Record<number, number>; // year -> score
  
  // Tracking for calculations
  debtStressHistory: boolean[]; // last 2 years
  familyActionHistory: number[]; // last 2 years
  
  // Trait gains tracking
  totalYearsMarried: number; // across all marriages
  communicationGained: number; // max 20%
  compassionGained: number; // max 20%
  patienceGained: number; // max 20%
}
```

**Divorce Settlement**:
```typescript
interface DivorceSettlement {
  playerId: string;
  spouseId: string;
  divorceYear: number;
  
  // Original values at marriage
  playerOriginalMoney: number;
  spouseOriginalMoney: number;
  playerOriginalSavings: number;
  spouseOriginalSavings: number;
  playerOriginalLoans: number;
  spouseOriginalLoans: number;
  
  // Current values at divorce
  currentMoney: number;
  currentSavings: number;
  currentLoans: number;
  
  // Settlement
  playerMoneyAfterDivorce: number;
  playerSavingsAfterDivorce: number;
  playerLoansAfterDivorce: number;
  
  // Assets
  vehicleKept: string; // vehicleId
}
```

**Child**:
```typescript
interface Child {
  id: string;
  age: number;
  isAdopted: boolean;
  hasChildren: boolean;
  childrenCount: number;
}
```

**Pet**:
```typescript
interface Pet {
  id: string;
  type: 'small' | 'large';
  age: number;
  deathAgeRange: [number, number];
  isAlive: boolean;
}
```

### 3.7 Financial Data

**Loan**:
```typescript
interface Loan {
  id: string;
  principal: number;
  currentBalance: number;
  interestRate: number; // 8% annual
  minimumPayment: number; // 5% of balance
  originAge: number;
  isJoint: boolean; // acquired during marriage
  ownerId?: string; // 'player' | 'spouse'
}
```

**Retirement Transaction** (tracking history):
```typescript
interface RetirementTransaction {
  year: number;
  age: number;
  type: 'contribution' | 'withdrawal' | 'interest' | 'penalty';
  amount: number;
  balanceAfter: number;
  reason?: string; // e.g., 'annual contribution', 'early withdrawal', 'retirement income'
}
```

**Tax Bracket**:
```typescript
interface TaxBracket {
  minIncome: number;
  maxIncome: number | null;
  rate: number;
  filingStatus: 'single' | 'married';
}
```

**Inflation Rates**:
```typescript
interface InflationRates {
  year: number;
  housing: number; // 4-7%
  salary: number; // 2-5%
  autoInsurance: number; // 2-5%
  homeInsurance: number; // 7-9%
  other: number; // 0.1-0.3%
}
```

### 3.8 Card System

**Card**:
```typescript
interface Card {
  id: string;
  name: string;
  description: string;
  type: 'good' | 'bad';
  frequency: number; // weight for random selection
  
  // Eligibility
  requirements: {
    minAge?: number;
    maxAge?: number;
    hasVehicle?: boolean;
    hasHome?: boolean;
    hasChildren?: boolean;
    hasPets?: boolean;
    location?: 'city' | 'suburb';
    other?: string[];
  };
  
  // Effects
  effects: {
    cost?: number;
    healthTemporary?: number;      // Temporary health change (affects current health only)
    healthPermanent?: number;      // Permanent health change (affects both current health AND maxHealth)
    stress?: number;
    insuranceReduction?: number; // percentage if insured
    insuranceAffected?: 'health' | 'auto' | 'home';
    skills?: Partial<Skills>;
    traits?: Partial<Traits>;
    other?: string[];
  };
  // Good Deed
  isGoodDeedOpportunity: boolean;
  goodDeedLemonReward?: number;
}
// Example 1: Car accident - temporary injury and permanent damage
{
  name: "Car Accident",
  effects: {
    healthTemporary: -10,  // Immediate injury
    healthPermanent: -5,   // Lasting damage
    cost: 5000
  }
}

// Example 2: Stay Up Late action - only permanent damage
{
  name: "Stay Up Late",
  effects: {
    healthPermanent: -1,   // Reduces max health
    stress: -5
  }
}

// Example 3: Exercise - only temporary health gain
{
  name: "Go to Gym",
  effects: {
    healthTemporary: 5,    // Improves current health
    stress: -3
  }
}

// Example 4: Surgery - temporary loss but permanent gain
{
  name: "Successful Surgery",
  effects: {
    healthTemporary: -15,  // Recovery period
    healthPermanent: 10,   // Fixes underlying issue
    cost: 50000
  }
}

```

**Card Event**:
```typescript
interface CardEvent {
  cardId: string;
  playerId: string;
  year: number;
  effectsApplied: any;
  goodDeedResponses?: {
    playerId: string;
    accepted: boolean;
    lemonsEarned?: number;
  }[];
}
```

### 3.9 Notifications

**Notification**:
```typescript
interface Notification {
  id: string;
  playerId: string;
  type: 'info' | 'warning' | 'success' | 'error';
  category: 'year' | 'job' | 'education' | 'health' | 'family' | 'certification' | 'housing' | 'vehicle' | 'pitcher';
  
  title: string;
  message: string;
  
  // Display
  persistent: boolean; // show in navbar
  dismissible: boolean;
  
  // Timing
  createdAt: Date;
  dismissedAt?: Date;
  
  // Action
  actionRequired: boolean;
  actionUrl?: string;
}
```

### 3.10 Career Progression

**Writing Progress**:
```typescript
interface WritingProgress {
  playerId: string;
  currentBook?: {
    timeBlocksCompleted: number;
  };
  publishedBooks: {
    year: number;
    selfPublished: boolean;
  }[];
}
```

**Acting Progress**:
```typescript
interface ActingProgress {
  playerId: string;
  hasAgent: boolean;
  rolesCompleted: {
    type: string;  // commercial, tv show, movie
    year: number;
    payment: number;
  }[];
}
```

**Music Progress**:
```typescript
interface MusicProgress {
  playerId: string;
  epsReleased: number;
  albumsReleased: number;
  performances: {
    type: 'bar' | 'school-dance' | 'fair' | 'tour-opening' | 'national-tour' | 'international-tour';
    year: number;
    payment: number;
  }[];
}
```

### 3.11 Messaging System

**Message**:
```typescript
interface Message {
  id: string;
  gameSessionId: string;
  playerId: string;
  playerName: string;
  content: string;
  timestamp: Date;
  reactions: MessageReaction[];
  isSystemMessage: boolean; // For automated messages (player joined, year started, etc.)
}

interface MessageReaction {
  emoji: string; // Unicode emoji character
  playerIds: string[]; // Players who reacted with this emoji
  count: number;
}

const SUPPORTED_EMOJIS = [
  '👍', // Thumbs up
  '❤️', // Heart
  '😂', // Laughing
  '😮', // Surprised
  '😢', // Sad
  '🎉', // Party
  '🍋', // Lemon (game-themed!)
  '💪', // Strong
  '🤔', // Thinking
  '👏'  // Clapping
];

```

## 4. Key Technical Decisions

### 4.1 Database Choice: PostgreSQL

**Rationale**:
- **ACID Compliance**: Critical for financial transactions and multiplayer state consistency
- **Complex Queries**: Supports complex joins for player stats, leaderboards, scrapbook data
- **JSON Support**: Can store flexible data like skills, traits, action history as JSONB
- **Mature Ecosystem**: Well-supported ORMs (Prisma, TypeORM), excellent tooling
- **Scalability**: Read replicas for scaling reads, proven at scale

**Alternative Considered**: MongoDB (NoSQL)
- Rejected due to lack of ACID guarantees for financial data
- Multiplayer coordination requires strong consistency
- Complex aggregations (scrapbook stats) easier with SQL

**Schema Design**:
- Normalized tables for core entities (players, sessions, jobs, actions)
- JSONB columns for flexible data (skills, traits, requirements)
- Indexes on frequently queried fields (gameSessionId, playerId, year)
- Foreign keys with cascading deletes for data integrity

### 4.2 Real-time Sync Strategy: WebSockets (Socket.IO)

**Rationale**:
- **Bidirectional Communication**: Server can push updates to clients instantly
- **Low Latency**: Critical for multiplayer coordination (year transitions, good deeds)
- **Automatic Reconnection**: Socket.IO handles disconnections gracefully
- **Room Support**: Built-in room management for game sessions
- **Fallback**: Automatically falls back to long-polling if WebSockets unavailable

**Alternative Considered**: Server-Sent Events (SSE)
- Rejected due to unidirectional nature (server → client only)
- Would require separate HTTP requests for client → server

**Alternative Considered**: Polling
- Rejected due to high latency and server load
- Not suitable for real-time multiplayer experience

**Implementation Strategy**:
- WebSocket for real-time events (lemon contributions, notifications, chat)
- REST API for CRUD operations (actions, profile updates)
- Optimistic updates on client with server confirmation
- Conflict resolution for concurrent updates (last-write-wins with version tracking)

### 4.3 State Management: Redux Toolkit + React Query

**Rationale**:
- **Redux Toolkit**: Global client state (player profile, cart, UI state)
  - Predictable state updates with reducers
  - DevTools for debugging
  - Middleware for side effects (Redux Thunk)
  
- **React Query**: Server state management
  - Automatic caching and invalidation
  - Background refetching
  - Optimistic updates
  - Reduces boilerplate for API calls

**State Separation**:
- **Redux**: Client-owned state (cart, UI preferences, temporary data)
- **React Query**: Server-owned state (player profile, actions, jobs, housing)
- **Socket.IO**: Real-time events (notifications, pitcher updates)

**Alternative Considered**: Context API only
- Rejected due to performance issues with frequent updates
- Lacks built-in caching and optimization

### 4.4 Security Considerations

**Authentication**:
- JWT tokens for stateless authentication
- Refresh tokens stored in httpOnly cookies
- Access tokens with short expiration (15 minutes)
- Token rotation on refresh

**Data Validation**:
- Input validation with Zod schemas on backend
- Sanitize user inputs to prevent XSS
- Parameterized queries to prevent SQL injection
- Rate limiting on API endpoints

**Game State Integrity**:
- Server is source of truth for all game state
- Client-side calculations are for display only
- Server validates all action eligibility and costs
- Prevent cheating through client manipulation

**WebSocket Security**:
- Authenticate WebSocket connections with JWT
- Validate player belongs to game session
- Rate limit WebSocket events
- Sanitize chat messages

### 4.5 Scalability Approach

**Horizontal Scaling**:
- Stateless application servers (scale with load balancer)
- Redis for distributed session storage
- Socket.IO Redis adapter for WebSocket clustering
- Database connection pooling

**Caching Strategy**:
- Cache static game data (actions, jobs, housing) in Redis
- Cache player state with short TTL
- Invalidate cache on updates
- CDN for static assets

**Database Optimization**:
- Indexes on frequently queried fields
- Read replicas for read-heavy operations
- Connection pooling (PgBouncer)
- Query optimization and monitoring

**Performance Targets** (Requirement 53):
- Support 10+ concurrent players per session
- Load player state < 2 seconds
- Process actions < 1 second
- Update pitcher < 1 second
- Year transitions < 5 seconds

**Monitoring**:
- Application Performance Monitoring (APM)
- Database query monitoring
- WebSocket connection tracking
- Error logging and alerting

## 5. API Design

### 5.1 REST API Endpoints

**Authentication**:
```
POST   /api/auth/register          - Register new player
POST   /api/auth/login             - Login player
POST   /api/auth/logout            - Logout player
POST   /api/auth/refresh           - Refresh access token
GET    /api/auth/me                - Get current player info
```

**Game Sessions**:
```
POST   /api/sessions               - Create new game session
GET    /api/sessions               - List available sessions
GET    /api/sessions/:id           - Get session details
POST   /api/sessions/:id/join      - Join game session
POST   /api/sessions/:id/leave     - Leave game session
DELETE /api/sessions/:id           - End game (host only)
POST   /api/sessions/:id/kick      - Kick player (any player with confirmation)
```

**Player Management**:
```
GET    /api/players/:id            - Get player profile
PATCH  /api/players/:id            - Update player profile
POST   /api/players/:id/initialize - Initialize new player (traits, skills, parent contributions)
GET    /api/players/:id/stats      - Get player statistics
GET    /api/players/:id/history    - Get action history
```

**Actions**:
```
GET   /api/actions    - Get action catalog (with filters, sort, search) 
GET   /api/actions/search?q=term    - Search actions by name/description 
GET   /api/actions/:id    - Get action details 
POST  /api/actions/execute    - Execute action(s) 
POST  /api/actions/validate     - Validate action eligibility 
GET   /api/actions/cart/validate    - Validate cart (time blocks, cost)
```

**Jobs**:
```
GET    /api/jobs                   - Get job catalog (with filters, sort, search)
GET     /api/jobs/search?q=term     - Search jobs by title
GET    /api/jobs/:id               - Get job details
POST   /api/jobs/:id/apply         - Apply for job
POST   /api/jobs/:id/quit          - Quit job
GET    /api/players/:id/employment - Get employment history
```

**Education**:
```
GET    /api/education/programs     - Get education programs (with filters, sort, search)
GET     /api/education/programs/search?q=term     - Search programs by name/field
GET    /api/education/programs/:id - Get program details
POST   /api/education/enroll       - Enroll in program
POST   /api/education/drop         - Drop out of program
POST   /api/education/change-major - Change major
POST   /api/education/scholarships - Apply for scholarship
GET    /api/players/:id/education  - Get education progress
```

**Housing**:
```
GET    /api/housing                - Get housing catalog (with filters)
GET    /api/housing/:id            - Get housing details
POST   /api/housing/:id/select     - Select housing
POST   /api/housing/improvements   - Add home improvement
POST   /api/housing/sell           - Sell owned housing
GET    /api/housing/compare        - Compare housing options
GET    /api/players/:id/housing-history - Get complete housing history
```

**Transportation**:
```
GET    /api/vehicles               - Get vehicle catalog (with filters)
GET    /api/vehicles/:id           - Get vehicle details
POST   /api/vehicles/:id/purchase  - Purchase vehicle
POST   /api/vehicles/:id/sell      - Sell vehicle
GET    /api/vehicles/compare       - Compare vehicle options
GET    /api/players/:id/vehicle-history - Get complete vehicle ownership history
```

**Financial**:
```
GET    /api/finances/:playerId     - Get financial summary
POST   /api/finances/loan          - Take out loan
POST   /api/finances/loan/payment  - Make loan payment
POST   /api/finances/retirement    - Contribute to retirement
POST   /api/finances/retirement/withdraw - Withdraw from retirement
GET    /api/finances/retirement-history/:playerId - Get complete retirement transaction history
GET    /api/finances/expenses      - Get annual expenses breakdown
POST   /api/finances/pay-expenses  - Pay annual expenses
GET    /api/finances/forecast      - Get expense forecast
GET    /api/finances/tax-brackets  - Get current tax brackets
```

**Relationships**:
```
POST   /api/relationships/marry    - Get married
POST   /api/relationships/divorce  - Get divorced
POST   /api/relationships/child    - Try for child
POST   /api/relationships/adopt    - Adopt child
POST   /api/pets/adopt             - Adopt pet
POST   /api/pets/:id/release       - Release pet for adoption
```

**Cards**:
```
GET    /api/cards/:playerId        - Get cards for player this year
POST   /api/cards/:id/respond      - Respond to card (good deed)
```

**Lemonade Pitcher**:
```
GET    /api/pitcher/:sessionId     - Get pitcher status
POST   /api/pitcher/contribute     - Contribute lemons (automatic via actions)
```

**Year Cycle**:
```
POST   /api/year/complete          - Complete year and pay expenses
GET    /api/year/status            - Check if all players completed year
```

**Notifications**:
```
GET    /api/notifications/:playerId - Get player notifications
POST   /api/notifications/:id/dismiss - Dismiss notification
```

**Messaging**:
```
GET   /api/messages/:sessionId    - Get message history (paginated) 
POST  /api/messages    - Send message (also via WebSocket) 
POST  /api/messages/:messageId/react    - Add/remove emoji reaction 
DELETE /api/messages/:messageId/react     - Remove emoji reaction 
GET /api/messages/:sessionId/recent     - Get recent messages (last 50)
```

**Scrapbook**:
```
GET    /api/scrapbook/:playerId    - Get end-game summary
GET    /api/scrapbook/:playerId/badges - Get earned badges
GET    /api/scrapbook/:playerId/housing-summary - Get housing history summary
GET    /api/scrapbook/:playerId/vehicle-summary - Get vehicle history summary
GET    /api/scrapbook/:playerId/retirement-summary - Get retirement savings summary
```

**Settings**:
```
GET    /api/settings/:playerId     - Get player settings
PATCH  /api/settings/:playerId     - Update settings
```

### 5.2 WebSocket Event Structure

**Event Format**:
```typescript
interface SocketEvent {
  type: string;
  payload: any;
  timestamp: number;
  playerId?: string;
  sessionId: string;
}
```

**Example Events**:

```typescript
// Lemon contribution
{
  type: 'lemonAdded',
  payload: {
    playerId: 'player123',
    playerName: 'Alice',
    amount: 5,
    newTotal: 45,
    yearlyGoal: 80
  },
  timestamp: 1234567890,
  sessionId: 'session456'
}

// Good deed opportunity
{
  type: 'goodDeedOpportunity',
  payload: {
    cardId: 'card789',
    affectedPlayerId: 'player123',
    affectedPlayerName: 'Alice',
    description: 'Alice needs help moving',
    reward: 2,
    expiresAt: 1234567900
  },
  timestamp: 1234567890,
  sessionId: 'session456'
}

// Year started
{
  type: 'yearStarted',
  payload: {
    year: 5,
    newGoal: 100,
    message: 'Happy Birthday! You are now 23 years old.'
  },
  timestamp: 1234567890,
  sessionId: 'session456'
}

// Notification
{
  type: 'notification',
  payload: {
    notificationId: 'notif123',
    category: 'job',
    title: 'Job Terminated',
    message: 'Your organization and communication skills were too low for two consecutive years.',
    persistent: true
  },
  timestamp: 1234567890,
  playerId: 'player123',
  sessionId: 'session456'
}
```

### 5.3 Data Flow Patterns

**Action Execution Flow**:
1. Client: Player adds actions to cart
2. Client: Validates cart locally (time blocks, cost)
3. Client: Sends `POST /api/actions/execute` with action IDs
4. Server: Validates eligibility, time blocks, cost
5. Server: Applies action effects (lemons, health, stress, skills)
6. Server: Updates player state in database
7. Server: Broadcasts `lemonAdded` event via WebSocket
8. Server: Returns updated player state to client
9. Client: Updates local state and displays results

**Year Completion Flow**:
1. Client: Player reviews expenses
2. Client: Allocates payments (money, retirement, loans)
3. Client: Sends `POST /api/year/complete`
4. Server: Validates payment allocation
5. Server: Deducts expenses, applies taxes
6. Server: Marks player year as complete
7. Server: Checks if all players completed year
8. If all complete:
   - Server: Increments year for all players
   - Server: Processes beginning-of-year events (aging, job raises)
   - Server: Broadcasts `yearStarted` event to all players
   - Server: Resets player states for new year
9. Client: Displays birthday message and new year UI

**Good Deed Flow**:
1. Server: Draws card with good deed opportunity for Player A
2. Server: Broadcasts `goodDeedOpportunity` to all other players
3. Client: Other players see notification
4. Client: Player B accepts, sends `POST /api/cards/:id/respond`
5. Server: Calculates lemons (2 × good deed multiplier)
6. Server: Updates Player B's good deed count and lemons
7. Server: Broadcasts `lemonAdded` event
8. Server: Notifies Player A that Player B helped
9. Client: Updates UI for both players

## 6. Game Engine Design

### 6.1 Year Cycle Processing

**Year Start Sequence**:
```typescript
async function startNewYear(sessionId: string) {
  const session = await getSession(sessionId);
  const players = await getPlayers(sessionId);
  
  for (const player of players) {
    // 1. Increment age
    player.age += 1;
    
    // 2. Apply aging effects
    await applyAgingEffects(player);
    
    // 3. Reset stress to 0
    player.stress = 0;
    
    // 4. Apply job raises
    await processJobRaises(player);
    
    // 5. Apply job skill/trait gains
    await applyJobGains(player);
    
    // 6. Process education progress
    await processEducation(player);
    
    // 7. Age children and pets
    await ageFamily(player);
    
    // 8. Roll for grandchildren
    await rollForGrandchildren(player);
    
    // 9. Apply inflation
    await applyInflation(player, session);
    
    // 10. Update tax brackets (every 5 years)
    if (session.currentYear % 5 === 0) {
      await updateTaxBrackets(session);
    }
    
    // 11. Reset year completion flag
    player.yearComplete = false;

    // 12. Reset cards received counter 
    player.cardsReceivedThisYear = 0;
    
    // 13. Save player state
    await savePlayer(player);
    
    // 14. Send birthday notification
    await sendNotification(player, {
      type: 'year',
      title: 'Happy Birthday!',
      message: `You are now ${player.age} years old.`
    });
  }
  
  // Update session year
  session.currentYear += 1;
  await saveSession(session);
  
  // Broadcast year started event
  broadcastToSession(sessionId, {
    type: 'yearStarted',
    payload: {
      year: session.currentYear,
      newGoal: calculateYearlyGoal(session)
    }
  });
}
```

### 6.2 Time Block Allocation Algorithm

```typescript
function calculateTimeBlocks(player: Player): TimeBlockAllocation {
  const allocation = {
    sleep: 20,
    work: 0,
    childcare: 0,
    commute: 0,
    pets: 0,
    activities: 40
  };
  
  // 1. Sleep (default 20, can be reduced by "stay up late" action)
  allocation.sleep = 20 - player.stayUpLateCount;
  
  // 2. Work (sum of all jobs)
  for (const job of player.jobs.filter(j => j.isActive)) {
    const jobData = await getJob(job.jobId);
    allocation.work += jobData.timeBlocks;
  }
  
  // 3. Childcare (if has children under 18)
  if (player.children.some(c => c.age < 18)) {
    allocation.childcare = calculateChildcareTimeBlocks(player);
  }
  
  // 4. Activities (remaining)
  allocation.activities = 60 - allocation.sleep - allocation.work - allocation.childcare - allocation.commute - allocation.pets;
  
  // 5. PTO adjustments (convert work to activities)
  if (player.ptoUsed > 0) {
    allocation.work -= ptoUsed;
    allocation.activities += ptoUsed;
  }
  
  return allocation;
}

function calculateChildcareTimeBlocks(player: Player): number {
  const numSectionsYouCareForKids = 0
  for (const job of player.jobs) {
    if job.isActive {
      if job.isPartTime {
        numSectionsYouCareForKids += 1;
      }
      else {
        numSectionsYouCareForKids += 2;
      }
    }
  }
  for (const edu of player.education) {
    if !edu.graduated {
      if edu.isPartTime {
        numSectionsYouCareForKids += 1;
      }
      else {
        numSectionsYouCareForKids += 2;
      }
    }
  }
  
  const numSectionsSpouseCareForKids = 0;
  if player.spouseId {
      if spouse.jobId {
        if spouse.isJobPartTime {
          numSectionsSpouseCareForKids += 1;
        else {
          numSectionsSpouseCareForKids += 2;
        }
      }  
      if spouse.educationProgramId {
        if spouse.isEduPartTime {
          numSectionsSpouseCareForKids += 1;
        else {
          numSectionsSpouseCareForKids += 2;
        }
      }  
    }
  }

  const children = player.children.filter(c => c.age < 18);
  if (children.length === 0) return 0;
  
  const youngestAge = Math.min(...children.map(c => c.age));
  
  // Base time blocks by youngest child's age
  let baseBlocks = 0;
  if (youngestAge <= 2) baseBlocks = 30;
  else if (youngestAge <= 5) baseBlocks = 24;
  else if (youngestAge <= 9) baseBlocks = 18;
  else if (youngestAge <= 12) baseBlocks = 12;
  else baseBlocks = 6;
  
  // Additional blocks for multiple children
  let additionalBlocks = 0;
  let skippedAYoungestChild = false;
  for (const child of children) {
    if((child.age === youngestAge) && !skippedAYoungestChild) {
      skippedAYoungestChild = true;
      continue;
    }
    if (child.age <= 2) additionalBlocks += 4;
    else if (child.age <= 5) additionalBlocks += 4;
    else if (child.age <= 9) additionalBlocks += 2;
    else if (child.age <= 12) additionalBlocks += 2;
    else additionalBlocks += 2;
  }
  

  // Reductions based on care arrangement
  let adjustments = 0
  if (numSectionsYouCareForKids === 0) && (numSectionsSpouseCareForKids !== 0) {
    adjustments -= (baseBlocks / 3) * numSectionsSpouseCareForKids
  }
  else {
    if (youngestAge <= 2) {
      adjustments -= 4 * Math.min([numSectionsYouCareForKids, numSectionsSpouseCareForKids])
    }
    else {
      adjustments -= 2 * Math.min([numSectionsYouCareForKids, numSectionsSpouseCareForKids])
    }
  }

  let totalBlocks = baseBlocks + additionalBlocks + adjustments;
  
  // Childcare purchase reductions
  if (player.childcare) {
    const reduction = getChildcareReduction(player.childcare.type);
    totalBlocks = Math.floor(totalBlocks * (1 - reduction));
  }
  
  return totalBlocks;
}
```

### 6.3 Health Calculation Engine

```typscript
async function calculateHealth(player: Player): Promise<number> {
  let health = player.health;
  const stress = player.stress;
  
  // 1. Stress-based health loss
  if (health >= 70) {
    if (stress > 90) health -= 2;
    else if (stress > 80) health -= 1;
  } else if (health >= 50) {
    if (stress > 85) health -= 3;
    else if (stress > 75) health -= 2;
  } else {
    if (stress > 80) health -= 4;
    else if (stress > 70) health -= 3;
  }
  
  // 2. Aging effects
  const age = player.age;
  if (age >= 40 && age < 50) health -= 1;
  else if (age >= 50 && age < 60) health -= 2;
  else if (age >= 60 && age < 70) health -= 3;
  else if (age >= 70 && age < 80) health -= 4;
  else if (age >= 80) health -= 5;
  
  // 3. Calculate and update max health based on chronic conditions
  const conditionPenalty = player.chronicConditions.length * 15;
  const maxHealth = 100 - conditionPenalty;
  player.maxHealth = maxHealth;  // UPDATE PLAYER'S MAX HEALTH
  
  // 4. Cap at max health
  health = Math.min(health, maxHealth);
  
  // 5. Floor at 0
  health = Math.max(health, 0);
  
  // 6. Check for death
  if (health <= 5) {
    const deathRoll = Math.random();
    if (deathRoll < 0.2) {
      await handlePlayerDeath(player);
    }
  }
  
  return health;
}

function applyHealthEffects(player: Player, temporaryChange: number = 0, permanentChange: number = 0): void {
  // Apply temporary health change (affects current health only)
  if (temporaryChange !== 0) {
    if (temporaryChange > 0) {
      // Health gain
      if (player.chronicConditions.length > 0) {
        // 80% effectiveness for chronic conditions (round up)
        temporaryChange = Math.ceil(temporaryChange * 0.8);
      }
      player.health = Math.min(player.health + temporaryChange, player.maxHealth);
    } else {
      // Health loss (temporaryChange is negative)
      player.health += temporaryChange;
      player.health = Math.max(player.health, 0); // Floor at 0
    }
  }
  
  // Apply permanent health change (affects both current health AND maxHealth)
  if (permanentChange !== 0) {
    if (permanentChange > 0) {
      // Permanent health gain (increases max health)
      player.maxHealth += permanentChange;
      player.maxHealth = Math.min(player.maxHealth, 100); // Cap at 100
      
      // Also increase current health
      if (player.chronicConditions.length > 0) {
        permanentChange = Math.ceil(permanentChange * 0.8);
      }
      player.health = Math.min(player.health + permanentChange, player.maxHealth);
    } else {
      // Permanent health loss (reduces max health)
      player.maxHealth += permanentChange; // permanentChange is negative
      player.maxHealth = Math.max(player.maxHealth, 0); // Floor at 0
      
      // Also reduce current health
      player.health += permanentChange;
      player.health = Math.max(player.health, 0); // Floor at 0
      
      // Cap current health at new max
      player.health = Math.min(player.health, player.maxHealth);
    }
  }
}
/**
 * Usage Examples:
 * 
 * // Card with only temporary health loss (-5 health)
 * applyHealthEffects(player, -5, 0);
 * 
 * // Card with only permanent health loss (-2 max health)
 * applyHealthEffects(player, 0, -2);
 * 
 * // Card with both temporary (-5) and permanent (-2) health loss
 * applyHealthEffects(player, -5, -2);
 * 
 * // Action with temporary health gain (+10)
 * applyHealthEffects(player, 10, 0);
 * 
 * // When applying card effects:
 * applyHealthEffects(
 *   player, 
 *   card.effects.healthTemporary || 0,
 *   card.effects.healthPermanent || 0
 * );
 * 
 * // When applying action effects:
 * applyHealthEffects(
 *   player,
 *   action.effects.healthTemporary || 0,
 *   action.effects.healthPermanent || 0
 * );
 */

```

### 6.4 Stress Calculation Engine

```typscript
function calculateStress(player: Player): number {
  let stress = 0;
  
  // 1. Job stress
  for (const employment of player.jobs.filter(j => j.isActive)) {
    const job = getJob(employment.jobId);
    let jobStress = job.stressLevel;
    
    // First year of new job: add 5% to job stress
    if (employment.yearsOfService === 0) {
      jobStress = Math.floor(jobStress * 1.05);
    }
    
    stress += jobStress;
  }
  
  // 2. Education stress
  for (const education of player.education.filter(e => e.isActive)) {
    const program = getProgram(education.programId);
    let programStress = program.stressLevel;
    if (program.isStem) programStress *= 1.2; // STEM is more stressful
    stress += programStress;
  }
  
  // 3. Debt stress (1% per $20,000)
  let totalDebt = player.loans.reduce((sum, loan) => sum + loan.currentBalance, 0);
  if (player.spouse) {
    const spouseDebt = player.spouse.loans.reduce((sum, loan) => sum + loan.currentBalance, 0);
    totalDebt += spouseDebt;
  }
  stress += Math.floor(totalDebt / 20000);
  
  // 4. Children stress (1% per child under 18)
  const childrenUnder18 = player.children.filter(c => c.age < 18).length;
  stress += childrenUnder18;
  
  // 5. Pet stress (1% per pet)
  const alivePets = player.pets.filter(p => p.isAlive).length;
  stress += alivePets;
  
  // 6. Housing overcrowding stress
  const housing = getHousing(player.currentHousingId);
  const occupants = calculateOccupants(player);
  if (occupants > housing.recommendedOccupancy) {
    const extraPeople = occupants - housing.recommendedOccupancy;
    stress += extraPeople * 2; // +2 stress per extra person
  }
  
  // 7. Card stress
  stress += player.cardStressThisYear || 0;
  
  // 8. Low funds stress (from expense forecast)
  const forecast = calculateExpenseForecast(player);
  if (forecast.remainingFunds <= 1000) stress += 5;
  else if (forecast.remainingFunds <= 5000) stress += 3;
  else if (forecast.remainingFunds <= 10000) stress += 1;
  
  // 9. Apply stress tolerance trait
  if (player.traits.stressTolerance >= 67) {
    stress = Math.floor(stress * 0.85); // 15% reduction
  } else if (player.traits.stressTolerance < 34) {
    stress = Math.floor(stress * 1.10); // 10% increase
  }
  
  // 10. Cap at 100
  return Math.min(stress, 100);
}

function calculateOccupants(player: Player): number {
  let occupants = 1; // Player
  
  if (player.spouse) {
    occupants += 1;
  }
  
  // Children under 18 living at home
  occupants += player.children.filter(c => c.age < 18).length;
  
  return occupants;
}

function hasChildrenUnder18(player: Player): boolean {
  return player.children.some(c => c.age < 18);
}

function getFamilySize(player: Player): number {
  // Same as calculateOccupants - total family members
  return calculateOccupants(player);
}

function canVehicleFitFamily(vehicle: Vehicle, player: Player): boolean {
  const familySize = getFamilySize(player);
  return vehicle.passengerCapacity >= familySize;
}
```

### 6.5 Financial Calculation Engine

**Tax Calculation**:
```typescript
function calculateTaxes(player: Player, session: GameSession): number {
  const income = player.projectedIncome;
  if (player.spouse) {
    income += player.spouse.salary;
  }
  
  const filingStatus = player.spouse ? 'married' : 'single';
  const brackets = session.taxBrackets.filter(b => b.filingStatus === filingStatus);
  
  let tax = 0;
  let remainingIncome = income;
  
  for (const bracket of brackets) {
    const bracketMax = bracket.maxIncome || Infinity;
    const taxableInBracket = Math.min(
      remainingIncome,
      bracketMax - bracket.minIncome
    );
    
    if (taxableInBracket > 0) {
      tax += taxableInBracket * bracket.rate;
      remainingIncome -= taxableInBracket;
    }
    
    if (remainingIncome <= 0) break;
  }
  
  // Add early retirement withdrawal penalty
  if (player.age < 65 && player.earlyRetirementWithdrawal > 0) {
    tax += player.earlyRetirementWithdrawal * 0.10;
  }
  
  return Math.round(tax);
}

function calculateTaxPreparationFee(player: Player): number {
  // Simple filing: no fee
  const isSimple = !player.spouse && 
                   player.jobs.length <= 1 && 
                   player.loans.length === 0;
  
  if (isSimple) return 0;
  
  // Accounting experience: no fee
  const youHaveAccountingExperience = player.jobs.some(job => job.title === 'Accountant');
  const spouseHasAccountingExperience = player.spouse && player.spouse.jobs.some(job => job.title === 'Accountant');
  if (youHaveAccountingExperience || spouseHasAccountingExperience) return 0;
  
  // Complex filing: $200-500 based on complexity
  let fee = 200;
  if (player.spouse) fee += 100;
  if (player.loans.length > 2) fee += 100;
  if (player.jobs.length > 1) fee += 100;
  
  return Math.min(fee, 500);
}
```

**Loan Interest**:
```typescript
function applyLoanInterest(loans: Loan[]): void {
  for (const loan of loans) {
    const interest = loan.currentBalance * 0.08; // 8% annual
    loan.currentBalance += interest;
    loan.minimumPayment = loan.currentBalance * 0.05; // 5% minimum
  }
}
```

**Retirement Interest**:
```typescript
function applyRetirementInterest(player: Player, year: number): void {
  const interestAmount = player.retirementSavings * 0.05; // 5% annual interest
  player.retirementSavings += interestAmount;
  
  // Track interest transaction
  player.retirementHistory.push({
    year: year,
    age: player.age,
    type: 'interest',
    amount: interestAmount,
    balanceAfter: player.retirementSavings,
    reason: 'annual interest (5%)'
  });
}
```

### 6.6 Random Event Generation

**Card Drawing Mechanics**:
- 20% chance of drawing a card after each action (express checkout or adding to cart)
- Maximum 3 cards per player per year
- Cards are drawn from eligible cards based on weighted frequency

**Card Drawing Implementation**:
```typescript
async function attemptCardDraw(player: Player): Promise<Card | null> {
  // Check if player has reached max cards for the year
  if (player.cardsReceivedThisYear >= 3) {
    return null;
  }
  
  // 20% chance to draw a card
  const drawChance = Math.random();
  if (drawChance > 0.20) {
    return null;
  }
  
  // Draw a card
  const card = drawCard(player);
  
  if (card) {
    player.cardsReceivedThisYear += 1;
    await savePlayer(player);
    
    // Broadcast card drawn event
    broadcastToSession(player.gameSessionId, {
      type: 'cardDrawn',
      payload: {
        playerId: player.id,
        playerName: player.name,
        cardId: card.id,
        cardName: card.name
      }
    });
  }
  
  return card;
}

function drawCard(player: Player): Card | null {
  const allCards = getCardCatalog();
  
  // Filter eligible cards
  const eligibleCards = allCards.filter(card => {
    return checkCardEligibility(card, player);
  });
  
  if (eligibleCards.length === 0) {
    return null;
  }
  
  // Weighted random selection based on frequency
  const eligibleCardsFreqs = [];
  for (const card of eligibleCards) {
    for (let i = 0; i < card.frequency; i++) {
      eligibleCardsFreqs.push(card);
    }
  }
  
  // Draw a card
  const pickedCardIdx = Math.floor(Math.random() * eligibleCardsFreqs.length);
  const drawnCard = eligibleCardsFreqs[pickedCardIdx];
  
  return drawnCard;
}

function checkCardEligibility(card: Card, player: Player): boolean {
  const req = card.requirements;
  
  if (req.minAge && player.age < req.minAge) return false;
  if (req.maxAge && player.age > req.maxAge) return false;
  if (req.hasVehicle && player.currentVehicleIds.length === 0) return false;
  if (req.hasHome && !isHomeOwner(player)) return false;
  if (req.hasChildren && !hasChildrenUnder18(player)) return false;
  if (req.hasPets && player.pets.filter(p => p.isAlive).length === 0) return false;
  if (req.location && player.location !== req.location) return false;
  
  return true;
}

**Probability Distributions**:
```typescript
// Bell curve (normal distribution) for traits and skills
function bellCurve(min: number, max: number): number {
  const mean = (min + max) / 2;
  const stdDev = (max - min) / 6; // 99.7% within range
  
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  
  // Box-Muller transform
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  const value = mean + z * stdDev;
  
  return Math.max(min, Math.min(max, value));
}

// Right-skewed distribution for art, music, home repair
function rightSkewed(min: number, max: number): number {
  const random = Math.random();
  const skewed = Math.pow(random, 2); // Square for right skew
  return min + skewed * (max - min);
}

// Left-skewed distribution for initial health
function leftSkewed(min: number, max: number): number {
  const random = Math.random();
  const skewed = 1 - Math.pow(1 - random, 2); // Inverse square for left skew
  return min + skewed * (max - min);
}

// Uniform distribution for dice rolls
function rollDie(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}
```

**Parent Contribution Roll**:
```typescript
function rollParentContributions(): ParentContributions {
  const roll = rollDie(10);
  
  const contributions = {
    vehicle: null as string | null,
    collegeFunding: 0,
    housingAgeLimit: 0,
    weddingContribution: 0,
    personalSavings: 0
  };
  
  switch (roll) {
    case 1:
      contributions.vehicle = null;
      contributions.collegeFunding = 0;
      contributions.housingAgeLimit = 20;
      contributions.weddingContribution = 0;
      contributions.personalSavings = 1000;
      break;
    case 2:
    case 3:
      contributions.vehicle = 'used_car';
      contributions.collegeFunding = 10000;
      contributions.housingAgeLimit = 22;
      contributions.weddingContribution = 5000;
      contributions.personalSavings = 2000;
      break;
    // ... cases 4-10 with increasing benefits
    case 10:
      contributions.vehicle = 'new_car';
      contributions.collegeFunding = 100000;
      contributions.housingAgeLimit = 26;
      contributions.weddingContribution = 50000;
      contributions.personalSavings = 10000;
      break;
  }
  
  return contributions;
}
```

### 6.7 Inflation System

```typescript
function applyInflation(player: Player, session: GameSession): void {
  const rates = session.inflationRates;
  
  // Housing costs
  if (player.housing.isRental) {
    player.housing.rentPerYear *= (1 + rates.housing / 100);
  } else {
    player.housing.value *= (1 + rates.housing / 100);
    player.housing.insurancePerYear *= (1 + rates.homeInsurance / 100);
  }
  
  // Salary
  for (const employment of player.jobs.filter(j => j.isActive)) {
    employment.currentSalary *= (1 + rates.salary / 100);
  }
  
  // Auto insurance
  for (const vehicleId of player.vehicleIds) {
    const vehicle = getVehicle(vehicleId);
    vehicle.insuranceBase *= (1 + rates.autoInsurance / 100);
  }
  
  // Action costs (applied to catalog, not player-specific)
  // This would be done once per year for the entire game
}

function generateInflationRates(): InflationRates {
  return {
    year: currentYear,
    housing: 4 + Math.random() * 3, // 4-7%
    salary: 2 + Math.random() * 3, // 2-5%
    autoInsurance: 2 + Math.random() * 3, // 2-5%
    homeInsurance: 7 + Math.random() * 2, // 7-9%
    other: 0.1 + Math.random() * 0.2 // 0.1-0.3%
  };
}
```

### 6.8 Good Deed Multiplier System

```typescript
function calculateGoodDeedMultiplier(player: Player): number {
  return 1 + Math.floor(player.goodDeedCount / 5);
}

function calculateBadDeedMultiplier(player: Player): number {
  return 1 + Math.floor(player.badDeedCount / 5);
}

async function handleGoodDeedResponse(
  cardId: string,
  respondingPlayerId: string,
  accepted: boolean
): Promise<void> {
  const respondingPlayer = await getPlayer(respondingPlayerId);
  
  if (accepted) {
    // Grant lemons with multiplier
    const multiplier = calculateGoodDeedMultiplier(respondingPlayer);
    const lemons = 2 * multiplier;
    
    respondingPlayer.goodDeedCount += 1;
    respondingPlayer.totalLemonsEarned += lemons;
    
    // Add to pitcher
    await addLemonsToPitcher(respondingPlayer.gameSessionId, lemons);
    
    // Broadcast lemon addition
    broadcastToSession(respondingPlayer.gameSessionId, {
      type: 'lemonAdded',
      payload: {
        playerId: respondingPlayerId,
        playerName: respondingPlayer.name,
        amount: lemons,
        reason: 'good_deed'
      }
    });
  } else {
    // Deduct lemons with bad deed multiplier
    const multiplier = calculateBadDeedMultiplier(respondingPlayer);
    const lemonLoss = 1 * multiplier;
    
    respondingPlayer.badDeedCount += 1;
    respondingPlayer.totalLemonsEarned -= lemonLoss;
    
    // Remove from pitcher
    await removeLemonsFromPitcher(respondingPlayer.gameSessionId, lemonLoss);
    
    // Broadcast lemon removal
    broadcastToSession(respondingPlayer.gameSessionId, {
      type: 'lemonRemoved',
      payload: {
        playerId: respondingPlayerId,
        playerName: respondingPlayer.name,
        amount: lemonLoss,
        reason: 'bad_deed'
      }
    });
  }
  
  await savePlayer(respondingPlayer);
}
```

### 6.9 Housing and Vehicle History Tracking

**Housing Change Tracking**:
```typescript
async function selectHousing(playerId: string, newHousingId: string): Promise<void> {
  const player = await getPlayer(playerId);
  const newHousing = await getHousing(newHousingId);
  
  // Close out current housing if exists
  if (player.currentHousingId) {
    const currentOwnership = player.housingHistory.find(
      h => h.housingId === player.currentHousingId && !h.endAge
    );
    
    if (currentOwnership) {
      currentOwnership.endAge = player.age;
      currentOwnership.yearsLived = currentOwnership.endAge - currentOwnership.startAge;
      
      // If owned, handle sale
      if (!currentOwnership.isRental) {
        const currentHousing = await getHousing(currentOwnership.housingId);
        const salePrice = calculateHousingSalePrice(
          currentOwnership.purchasePrice,
          currentOwnership.improvements,
          currentOwnership.yearsLived
        );
        currentOwnership.salePrice = salePrice;
        player.money += salePrice;
      } else {
        // Calculate total rent paid
        const currentHousing = await getHousing(currentOwnership.housingId);
        currentOwnership.totalRentPaid = currentHousing.rentPerYear * currentOwnership.yearsLived;
      }
    }
  }
  
  // Create new housing ownership record
  const newOwnership: HousingOwnership = {
    housingId: newHousingId,
    startAge: player.age,
    endAge: undefined,
    isRental: newHousing.isRental,
    purchasePrice: newHousing.isRental ? undefined : newHousing.purchasePrice,
    salePrice: undefined,
    totalRentPaid: undefined,
    improvements: [],
    yearsLived: 0
  };
  
  player.housingHistory.push(newOwnership);
  player.currentHousingId = newHousingId;
  
  // Deduct purchase price if buying
  if (!newHousing.isRental) {
    player.money -= newHousing.purchasePrice;
  }
  
  await savePlayer(player);
}

function calculateHousingSalePrice(
  purchasePrice: number,
  improvements: HomeImprovement[],
  yearsOwned: number
): number {
  // Base appreciation (4-7% per year, use average 5.5%)
  const appreciation = Math.pow(1.055, yearsOwned);
  let salePrice = purchasePrice * appreciation;
  
  // Add improvement value
  const improvementValue = improvements.reduce((sum, imp) => sum + imp.valueIncrease, 0);
  salePrice += improvementValue;
  
  return Math.round(salePrice);
}
```

**Vehicle Change Tracking**:
```typescript
async function validateVehicleCapacity(vehicleId: string, player: Player): Promise<boolean> {
  const vehicle = await getVehicle(vehicleId);
  const familySize = getFamilySize(player);
  
  if (vehicle.passengerCapacity < familySize) {
    return false;
  }
  
  return true;
}


async function purchaseVehicle(playerId: string, vehicleId: string, isParentGift: boolean = false): Promise<void> {
  const player = await getPlayer(playerId);
  const vehicle = await getVehicle(vehicleId);

  // Validate vehicle can fit family
  if (!canVehicleFitFamily(vehicle, player)) {
    throw new Error(`Vehicle capacity (${vehicle.passengerCapacity}) is insufficient for family size (${getFamilySize(player)})`);
  }
  
  // Create new vehicle ownership record
  const newOwnership: VehicleOwnership = {
    vehicleId: vehicleId,
    startAge: player.age,
    endAge: undefined,
    purchasePrice: isParentGift ? 0 : vehicle.purchasePrice,
    salePrice: undefined,
    wasParentGift: isParentGift,
    totalMaintenancePaid: 0,
    totalInsurancePaid: 0,
    yearsOwned: 0
  };
  
  player.vehicleHistory.push(newOwnership);
  player.currentVehicleIds.push(vehicleId);
  
  // Deduct purchase price if not a gift
  if (!isParentGift && vehicle.purchasePrice) {
    player.money -= vehicle.purchasePrice;
  }
  
  await savePlayer(player);
}

async function sellVehicle(playerId: string, vehicleId: string): Promise<void> {
  const player = await getPlayer(playerId);
  
  // Find the ownership record
  const ownership = player.vehicleHistory.find(
    v => v.vehicleId === vehicleId && !v.endAge
  );
  
  if (!ownership) {
    throw new Error('Vehicle ownership not found');
  }
  
  // Close out ownership
  ownership.endAge = player.age;
  ownership.yearsOwned = ownership.endAge - ownership.startAge;
  
  // Calculate sale price (depreciation)
  const vehicle = await getVehicle(vehicleId);
  const salePrice = calculateVehicleSalePrice(
    ownership.purchasePrice || vehicle.purchasePrice,
    ownership.yearsOwned,
    vehicle.type
  );
  ownership.salePrice = salePrice;
  
  // Add money to player
  player.money += salePrice;
  
  // Remove from current vehicles
  player.currentVehicleIds = player.currentVehicleIds.filter(id => id !== vehicleId);
  
  await savePlayer(player);
}

function calculateVehicleSalePrice(
  purchasePrice: number,
  yearsOwned: number,
  vehicleType: string
): number {
  // Depreciation rates by type
  const depreciationRates = {
    'bike': 0.10, // 10% per year
    'motorcycle': 0.15, // 15% per year
    'car': 0.15, // 15% per year
    'public_transit': 0 // Can't sell
  };
  
  if (vehicleType === 'public_transit') return 0;
  
  const rate = depreciationRates[vehicleType] || 0.15;
  const remainingValue = purchasePrice * Math.pow(1 - rate, yearsOwned);
  
  // Floor at 10% of original value
  return Math.max(Math.round(remainingValue), Math.round(purchasePrice * 0.1));
}

async function trackAnnualVehicleCosts(player: Player): Promise<void> {
  // Track insurance and maintenance for all owned vehicles
  for (const vehicleId of player.currentVehicleIds) {
    const ownership = player.vehicleHistory.find(
      v => v.vehicleId === vehicleId && !v.endAge
    );
    
    if (ownership) {
      const vehicle = await getVehicle(vehicleId);
      ownership.totalInsurancePaid += vehicle.insuranceBase;
      ownership.totalMaintenancePaid += vehicle.maintenanceBase + vehicle.gasPerYear;
    }
  }
  
  await savePlayer(player);
}
```

### 6.10 Retirement Savings History Tracking

**Retirement Contribution Tracking**:
```typescript
async function contributeToRetirement(
  playerId: string, 
  amount: number, 
  year: number
): Promise<void> {
  const player = await getPlayer(playerId);
  
  // Validate player has enough money
  if (player.money < amount) {
    throw new Error('Insufficient funds for retirement contribution');
  }
  
  // Deduct from current money
  player.money -= amount;
  
  // Add to retirement savings
  player.retirementSavings += amount;
  
  // Track transaction
  player.retirementHistory.push({
    year: year,
    age: player.age,
    type: 'contribution',
    amount: amount,
    balanceAfter: player.retirementSavings,
    reason: 'voluntary contribution'
  });
  
  await savePlayer(player);
}
```

**Retirement Withdrawal Tracking**:
```typescript
async function withdrawFromRetirement(
  playerId: string,
  amount: number,
  year: number
): Promise<void> {
  const player = await getPlayer(playerId);
  
  // Validate sufficient retirement savings
  if (player.retirementSavings < amount) {
    throw new Error('Insufficient retirement savings');
  }
  
  // Calculate penalty if under 65
  let penalty = 0;
  if (player.age < 65) {
    penalty = amount * 0.10; // 10% early withdrawal penalty
  }
  
  // Withdraw from retirement
  player.retirementSavings -= amount;
  
  // Track withdrawal transaction
  player.retirementHistory.push({
    year: year,
    age: player.age,
    type: 'withdrawal',
    amount: -amount,
    balanceAfter: player.retirementSavings,
    reason: player.age < 65 ? 'early withdrawal' : 'retirement income'
  });
  
  // Track penalty if applicable
  if (penalty > 0) {
    player.retirementHistory.push({
      year: year,
      age: player.age,
      type: 'penalty',
      amount: -penalty,
      balanceAfter: player.retirementSavings,
      reason: 'early withdrawal penalty (10%)'
    });
    
    // Store penalty for tax calculation
    player.earlyRetirementWithdrawal = amount;
  }
  
  // Add to current money (minus penalty)
  player.money += (amount - penalty);
  
  await savePlayer(player);
}
```

**Retirement Summary Calculation**:
```typescript
interface RetirementSummary {
  totalContributions: number;
  totalWithdrawals: number;
  totalInterestEarned: number;
  totalPenalties: number;
  finalBalance: number;
  yearsOfContributions: number;
  averageAnnualContribution: number;
  firstContributionAge?: number;
  firstWithdrawalAge?: number;
  retirementAge?: number; // Age when player retired
}

function calculateRetirementSummary(player: Player): RetirementSummary {
  const history = player.retirementHistory;
  
  const contributions = history.filter(t => t.type === 'contribution');
  const withdrawals = history.filter(t => t.type === 'withdrawal');
  const interest = history.filter(t => t.type === 'interest');
  const penalties = history.filter(t => t.type === 'penalty');
  
  const totalContributions = contributions.reduce((sum, t) => sum + t.amount, 0);
  const totalWithdrawals = Math.abs(withdrawals.reduce((sum, t) => sum + t.amount, 0));
  const totalInterestEarned = interest.reduce((sum, t) => sum + t.amount, 0);
  const totalPenalties = Math.abs(penalties.reduce((sum, t) => sum + t.amount, 0));
  
  // Calculate years of contributions (unique years)
  const contributionYears = new Set(contributions.map(t => t.year));
  const yearsOfContributions = contributionYears.size;
  
  const averageAnnualContribution = yearsOfContributions > 0 
    ? totalContributions / yearsOfContributions 
    : 0;
  
  const firstContribution = contributions.length > 0 
    ? contributions[0] 
    : null;
  
  const firstWithdrawal = withdrawals.length > 0 
    ? withdrawals[0] 
    : null;
  
  return {
    totalContributions,
    totalWithdrawals,
    totalInterestEarned,
    totalPenalties,
    finalBalance: player.retirementSavings,
    yearsOfContributions,
    averageAnnualContribution: Math.round(averageAnnualContribution),
    firstContributionAge: firstContribution?.age,
    firstWithdrawalAge: firstWithdrawal?.age,
    retirementAge: player.isRetired ? player.age : undefined
  };
}
```

**Annual Interest Application** (updated in year cycle):
```typescript
async function processAnnualRetirementInterest(player: Player, year: number): Promise<void> {
  if (player.retirementSavings > 0) {
    const interestAmount = player.retirementSavings * 0.05; // 5% annual
    player.retirementSavings += interestAmount;
    
    // Track interest transaction
    player.retirementHistory.push({
      year: year,
      age: player.age,
      type: 'interest',
      amount: interestAmount,
      balanceAfter: player.retirementSavings,
      reason: 'annual interest (5%)'
    });
  }
  
  await savePlayer(player);
}
```

### 6.11 Game Chat System

**Send Message**:
```typescript
async function sendMessage(
  playerId: string,
  gameSessionId: string,
  content: string
): Promise<Message> {
  const player = await getPlayer(playerId);
  
  // Sanitize message content
  const sanitizedContent = sanitizeMessage(content);
  
  // Validate message length
  if (sanitizedContent.length === 0 || sanitizedContent.length > 500) {
    throw new Error('Message must be between 1 and 500 characters');
  }
  
  // Create message
  const message: Message = {
    id: generateUUID(),
    gameSessionId,
    playerId,
    playerName: player.name,
    content: sanitizedContent,
    timestamp: new Date(),
    reactions: [],
    isSystemMessage: false
  };
  
  // Save to database
  await saveMessage(message);
  
  // Broadcast to all players in session
  broadcastToSession(gameSessionId, {
    type: 'messageReceived',
    payload: message
  });
  
  return message;
}

function sanitizeMessage(content: string): string {
  // Remove HTML tags
  let sanitized = content.replace(/<[^>]*>/g, '');
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  // Remove excessive whitespace
  sanitized = sanitized.replace(/\s+/g, ' ');
  
  return sanitized;
}

async function reactToMessage(
  messageId: string,
  playerId: string,
  emoji: string
): Promise<Message> {
  // Validate emoji is supported
  if (!SUPPORTED_EMOJIS.includes(emoji)) {
    throw new Error('Unsupported emoji');
  }
  
  const message = await getMessage(messageId);
  
  // Find existing reaction for this emoji
  let reaction = message.reactions.find(r => r.emoji === emoji);
  
  if (reaction) {
    // Check if player already reacted with this emoji
    const playerIndex = reaction.playerIds.indexOf(playerId);
    
    if (playerIndex >= 0) {
      // Remove reaction (toggle off)
      reaction.playerIds.splice(playerIndex, 1);
      reaction.count -= 1;
      
      // Remove reaction object if count is 0
      if (reaction.count === 0) {
        message.reactions = message.reactions.filter(r => r.emoji !== emoji);
      }
    } else {
      // Add player to reaction
      reaction.playerIds.push(playerId);
      reaction.count += 1;
    }
  } else {
    // Create new reaction
    message.reactions.push({
      emoji,
      playerIds: [playerId],
      count: 1
    });
  }
  
  // Save updated message
  await saveMessage(message);
  
  // Broadcast reaction update
  broadcastToSession(message.gameSessionId, {
    type: 'messageReactionUpdated',
    payload: {
      messageId: message.id,
      reactions: message.reactions
    }
  });
  
  return message;
}

async function sendSystemMessage(
  gameSessionId: string,
  content: string
): Promise<Message> {
  const message: Message = {
    id: generateUUID(),
    gameSessionId,
    playerId: 'system',
    playerName: 'System',
    content,
    timestamp: new Date(),
    reactions: [],
    isSystemMessage: true
  };
  
  await saveMessage(message);
  
  broadcastToSession(gameSessionId, {
    type: 'messageReceived',
    payload: message
  });
  
  return message;
}

// Example system messages:
// - "Alice joined the game"
// - "Year 5 has started!"
// - "The lemonade pitcher goal was reached!"
// - "Bob completed their year"

### 6.12 Player Death Handling

**Player Death Handling**:
```typescript
async function handlePlayerDeath(player: Player): Promise<void> {
  // Mark player as deceased
  player.isAlive = false;
  player.health = 0;
  
  // Save player state
  await savePlayer(player);
  
  // Send death notification to player
  await sendNotification(player, {
    type: 'error',
    category: 'health',
    title: 'Game Over',
    message: 'Your health has reached zero. You can still view your game summary and chat with other players.',
    persistent: true,
    dismissible: false
  });
  
  // Notify other players
  broadcastToSession(player.gameSessionId, {
    type: 'playerDied',
    payload: {
      playerId: player.id,
      playerName: player.name,
      age: player.age,
      year: player.currentYear
    }
  });
  
  // Send system message to chat
  await sendSystemMessage(
    player.gameSessionId,
    `${player.name} has passed away at age ${player.age}.`
  );
  
  // Check if all players are deceased
  const session = await getSession(player.gameSessionId);
  const allPlayers = await getPlayers(player.gameSessionId);
  const allDead = allPlayers.every(p => !p.isAlive);
  
  if (allDead) {
    // End the game
    session.status = 'ended';
    session.endReason = 'all_deceased';
    await saveSession(session);
    
    broadcastToSession(player.gameSessionId, {
      type: 'gameEnded',
      payload: {
        reason: 'all_deceased',
        message: 'All players have passed away. The game has ended.'
      }
    });
  }
}
```

## 6. Game Algorithms and Mechanics

### 6.1 Dating App Algorithm (Find Love Action)

The dating app system generates compatible spouse candidates based on player preferences and realistic financial/career profiles.

**Algorithm Overview**:
```typescript
async function executeFindLoveAction(player: Player, preferences: SpousePreferences): Promise<DatingCandidate[]> {
  // Step 1: Validate player eligibility
  if (player.traits.communication < 50) {
    throw new Error('Requires communication >= 50');
  }
  if (player.traits.compassion < 50) {
    throw new Error('Requires compassion >= 50');
  }
  if (player.maritalStatus !== 'single') {
    throw new Error('Must be single to use Find Love');
  }
  
  // Step 2: Generate 3 candidates
  const candidates: DatingCandidate[] = [];
  for (let i = 0; i < 3; i++) {
    const candidate = await generateCandidate(player, preferences, i);
    candidates.push(candidate);
  }
  
  return candidates;
}
```

**Candidate Generation Algorithm**:
```typescript
async function generateCandidate(
  player: Player, 
  preferences: SpousePreferences, 
  index: number
): Promise<DatingCandidate> {
  const candidate: DatingCandidate = {
    age: player.age, // Always same age as player
    isRetired: player.age > 65,
    matchesCriteria: []
  };
  
  // Step 1: Determine education level (50% no degree, 50% has degree)
  const hasDegree = Math.random() < 0.5;
  if (hasDegree) {
    candidate.educationLevel = determineEducationByAge(player.age);
  } else {
    candidate.educationLevel = 'high_school';
  }
  
  // Step 2: Select job (if not retired)
  if (!candidate.isRetired) {
    // Query jobs that match at least one preference criterion
    const eligibleJobs = await queryJobsMatchingPreferences(
      preferences,
      candidate.educationLevel
    );
    
    // Exclude forbidden jobs: actor, author, ride-share driver, musician
    const filteredJobs = eligibleJobs.filter(job => 
      !['actor', 'author', 'ride-share-driver', 'musician'].includes(job.id)
    );
    
    // Randomly select job
    const job = filteredJobs[Math.floor(Math.random() * filteredJobs.length)];
    candidate.jobId = job.id;
    candidate.jobTitle = job.title;
    candidate.salary = calculateInflatedSalary(job.baseSalary, player.age);
    candidate.pto = job.ptoDays;
    candidate.educationInterest = job.field || 'general';
    
    // Track which criteria this job matches
    if (preferences.salary && Math.abs(candidate.salary - preferences.salary) < 10000) {
      candidate.matchesCriteria.push('salary');
    }
    if (preferences.pto && candidate.pto >= preferences.pto) {
      candidate.matchesCriteria.push('pto');
    }
    if (preferences.educationInterest && candidate.educationInterest === preferences.educationInterest) {
      candidate.matchesCriteria.push('education');
    }
  } else {
    candidate.jobTitle = 'RETIRED';
    candidate.salary = 0;
    candidate.pto = 0;
  }
  
  // Step 3: Calculate financial profile
  candidate.retirementSavings = calculateSpouseRetirementSavings(
    candidate.salary,
    player.age
  );
  
  const totalEarnings = calculateTotalEarnings(candidate.salary, player.age);
  const spendingRate = getSpendingRate(candidate.salary);
  candidate.money = totalEarnings - candidate.retirementSavings - (totalEarnings * spendingRate);
  
  // Step 4: Calculate debt
  const debtMultiplier = rollDebtMultiplier(); // 1, 0.75, 0.5, 0.25, or 0
  const educationCost = calculateEducationCost(candidate.educationLevel);
  candidate.loans = educationCost * debtMultiplier;
  
  // Adjust money to include loans
  candidate.money -= candidate.loans;
  
  // Track money criteria match
  if (preferences.money && Math.abs(candidate.money - preferences.money) < 20000) {
    candidate.matchesCriteria.push('money');
  }
  
  // Step 5: Assign vehicle
  candidate.vehicleType = assignRandomVehicle(player.age);
  if (preferences.vehicleType && candidate.vehicleType === preferences.vehicleType) {
    candidate.matchesCriteria.push('vehicle');
  }
  
  // Step 6: Assign housing
  candidate.housingType = assignRandomHousing(player.age);
  if (preferences.housingType && candidate.housingType === preferences.housingType) {
    candidate.matchesCriteria.push('housing');
  }
  
  // Step 7: Calculate initial compatibility score
  candidate.initialCompatibilityScore = calculateInitialCompatibility(player);
  
  return candidate;
}
```

**Helper Functions**:
```typescript
function determineEducationByAge(age: number): string {
  if (age <= 20) return 'high_school';
  
  const possibleDegrees = [];
  if (age >= 20) possibleDegrees.push('associates');
  if (age >= 22) possibleDegrees.push('bachelors');
  if (age >= 24) possibleDegrees.push('masters');
  if (age >= 30) possibleDegrees.push('phd');
  
  return possibleDegrees[Math.floor(Math.random() * possibleDegrees.length)];
}

function calculateSpouseRetirementSavings(salary: number, age: number): number {
  let savingsRate: number;
  if (salary <= 35000) savingsRate = 0.01 + Math.random() * 0.04; // 1-5%
  else if (salary <= 70000) savingsRate = 0.03 + Math.random() * 0.07; // 3-10%
  else if (salary <= 105000) savingsRate = 0.05 + Math.random() * 0.10; // 5-15%
  else savingsRate = 0.15 + Math.random() * 0.05; // 15-20%
  
  let totalSavings = 0;
  for (let year = 18; year < age; year++) {
    const yearSalary = calculateInflatedSalary(salary, year);
    totalSavings += yearSalary * savingsRate;
    totalSavings *= 1.05; // 5% annual return
  }
  
  return Math.round(totalSavings);
}

function getSpendingRate(salary: number): number {
  if (salary <= 35000) return 0.90;
  if (salary <= 70000) return 0.80;
  if (salary <= 105000) return 0.60;
  return 0.50;
}

function rollDebtMultiplier(): number {
  const roll = Math.floor(Math.random() * 5) + 1; // 1-5
  const multipliers = [1, 0.75, 0.5, 0.25, 0];
  return multipliers[roll - 1];
}

function calculateInitialCompatibility(player: Player): number {
  let score = 0;
  
  // Player's contribution based on traits
  if (player.stress < 90) score += 1;
  if (player.traits.compassion >= 80) score += 1;
  if (player.traits.patience >= 80) score += 1;
  if (player.traits.stressTolerance >= 60) score += 1;
  if (player.traits.communication >= 80) score += 2;
  
  // Candidate's random contribution (0-2)
  score += Math.floor(Math.random() * 3);
  
  return score;
}
```

**Marriage Execution**:
```typescript
async function executeMarriage(player: Player, candidate: DatingCandidate): Promise<void> {
  // Create spouse from candidate
  const spouse: Spouse = {
    age: candidate.age,
    jobId: candidate.jobId,
    salary: candidate.salary,
    isJobPartTime: false,
    vehicleId: await createVehicleFromType(candidate.vehicleType),
    housingId: await createHousingFromType(candidate.housingType),
    loans: [{ 
      id: generateId(),
      principal: candidate.loans,
      currentBalance: candidate.loans,
      interestRate: 0.08,
      minimumPayment: candidate.loans * 0.05,
      originAge: player.age,
      isJoint: false,
      ownerId: 'spouse'
    }],
    originalMoney: candidate.money,
    originalSavings: candidate.retirementSavings,
    originalLoans: candidate.loans,
    isRetired: candidate.isRetired,
    certifications: []
  };
  
  // Store player's original financial state for divorce calculations
  player.originalMoney = player.money;
  player.originalSavings = player.retirementSavings;
  player.originalLoans = player.loans.reduce((sum, loan) => sum + loan.currentBalance, 0);
  
  // Combine finances
  player.money += candidate.money;
  player.retirementSavings += candidate.retirementSavings;
  player.loans.push(...spouse.loans);
  
  // Calculate wedding cost
  const isFirstMarriage = !player.hasBeenMarried;
  const baseCost = isFirstMarriage ? 30000 : 15000;
  const playerShare = baseCost / 2;
  const parentContribution = isFirstMarriage ? player.parentContributions.wedding : 0;
  const finalCost = playerShare - parentContribution;
  
  player.money -= finalCost;
  player.maritalStatus = 'married';
  player.spouseId = spouse.id;
  player.hasBeenMarried = true;
  
  // Initialize compatibility tracking
  await initializeMarriageCompatibility(player.id);
  
  await savePlayer(player);
  await saveSpouse(spouse);
}
```

### 6.2 Marriage Compatibility Calculation

```typescript
async function calculateAnnualCompatibility(player: Player): Promise<number> {
  let score = 0;
  
  // Check debt stress history (past 2 years)
  const debtStressHistory = await getDebtStressHistory(player.id, 2);
  if (debtStressHistory.every(hasStress => !hasStress)) {
    score += 2;
  }
  
  // Current stress
  if (player.stress < 90) {
    score += 1;
  }
  
  // Family actions (past 2 years)
  const familyActions = await getFamilyActionCount(player.id, 2);
  const hasKidsUnder18 = player.children.some(child => child.age < 18);
  
  if (hasKidsUnder18 && familyActions >= 1) {
    score += 2;
  } else if (!hasKidsUnder18 && familyActions >= 2) {
    score += 2;
  }
  
  // Traits
  if (player.traits.compassion >= 80) score += 1;
  if (player.traits.patience >= 80) score += 1;
  if (player.traits.stressTolerance >= 60) score += 1;
  if (player.traits.communication >= 80) score += 2;
  
  return score;
}
```

### 6.3 Divorce Settlement Calculation

```typescript
async function executeDivorce(player: Player): Promise<DivorceSettlement> {
  const spouse = await getSpouse(player.spouseId);
  
  // Calculate current totals
  const currentMoney = player.money;
  const currentSavings = player.retirementSavings;
  const currentLoans = player.loans.reduce((sum, loan) => sum + loan.currentBalance, 0);
  
  // Calculate joint accumulation
  const jointMoney = currentMoney - player.originalMoney - spouse.originalMoney;
  const jointSavings = currentSavings - player.originalSavings - spouse.originalSavings;
  const jointLoans = currentLoans - player.originalLoans - spouse.originalLoans;
  
  // Split 50/50 and add back original amounts
  const settlement: DivorceSettlement = {
    playerId: player.id,
    spouseId: player.spouseId,
    divorceYear: player.currentYear,
    playerOriginalMoney: player.originalMoney,
    spouseOriginalMoney: spouse.originalMoney,
    playerOriginalSavings: player.originalSavings,
    spouseOriginalSavings: spouse.originalSavings,
    playerOriginalLoans: player.originalLoans,
    spouseOriginalLoans: spouse.originalLoans,
    currentMoney,
    currentSavings,
    currentLoans,
    playerMoneyAfterDivorce: player.originalMoney + (jointMoney / 2),
    playerSavingsAfterDivorce: player.originalSavings + (jointSavings / 2),
    playerLoansAfterDivorce: player.originalLoans + (jointLoans / 2),
    vehicleKept: '', // player chooses
    childrenIds: player.children.map(c => c.id)
  };
  
  // Apply settlement
  player.money = settlement.playerMoneyAfterDivorce;
  player.retirementSavings = settlement.playerSavingsAfterDivorce;
  
  // Reconstruct loan list with player's share
  player.loans = [{
    id: generateId(),
    principal: settlement.playerLoansAfterDivorce,
    currentBalance: settlement.playerLoansAfterDivorce,
    interestRate: 0.08,
    minimumPayment: settlement.playerLoansAfterDivorce * 0.05,
    originAge: player.age,
    isJoint: false,
    ownerId: 'player'
  }];
  
  // Apply stress
  player.stress += 10;
  
  // Update marital status
  player.maritalStatus = 'divorced';
  player.spouseId = undefined;
  
  return settlement;
}
```

### 6.4 Child Adoption System

The adoption system allows players to adopt children of different ages with varying requirements and timelines.

**Adoption Application Data Model**:
```typescript
interface AdoptionApplication {
  id: string;
  playerId: string;
  ageGroup: '0-2' | '3-9' | '10-17';
  applicationYear: number;
  availabilityYear: number; // When child becomes available
  status: 'pending' | 'available' | 'accepted';
  childAge?: number; // Actual age when available
  notificationSent: boolean;
}
```

**Adoption Process Flow**:

```typescript
async function applyForAdoption(
  playerId: string,
  ageGroup: '0-2' | '3-9' | '10-17'
): Promise<AdoptionApplication> {
  const player = await getPlayer(playerId);
  
  // 1. Check eligibility requirements
  const requirements = getAdoptionRequirements(ageGroup);
  if (!meetsAdoptionRequirements(player, requirements)) {
    throw new Error('Does not meet adoption requirements');
  }
  
  // 2. Check if player already has pending application
  const existingApp = await getActiveAdoptionApplication(playerId);
  if (existingApp) {
    throw new Error('Already have pending adoption application');
  }
  
  // 3. Determine availability timeline
  const currentYear = player.currentYear;
  let availabilityYear: number;
  
  if (ageGroup === '0-2') {
    // Random 1-5 years (left-skewed distribution)
    const waitYears = generateLeftSkewedRandom(1, 5);
    availabilityYear = currentYear + waitYears;
  } else {
    // Available within current year
    availabilityYear = currentYear;
  }
  
  // 4. Create adoption application
  const application: AdoptionApplication = {
    id: generateId(),
    playerId,
    ageGroup,
    applicationYear: currentYear,
    availabilityYear,
    status: 'pending',
    notificationSent: false
  };
  
  await saveAdoptionApplication(application);
  
  // 5. If available this year, process immediately
  if (availabilityYear === currentYear) {
    await processAdoptionAvailability(application);
  }
  
  return application;
}

function getAdoptionRequirements(ageGroup: string) {
  switch (ageGroup) {
    case '0-2':
      return {
        maxStress: 50,
        maxPlayerAge: 42,
        timeBlocks: 2,
        waitMessage: 'typically within 6 years'
      };
    case '3-9':
      return {
        maxStress: 60,
        maxPlayerAge: 50,
        timeBlocks: 2,
        waitMessage: 'typically within 1 year'
      };
    case '10-17':
      return {
        maxStress: 60,
        maxPlayerAge: 55,
        timeBlocks: 2,
        waitMessage: 'typically within 1 year'
      };
  }
}

function meetsAdoptionRequirements(
  player: Player,
  requirements: any
): boolean {
  return (
    player.stress <= requirements.maxStress &&
    player.age <= requirements.maxPlayerAge
  );
}

// Called at beginning of each year
async function checkAdoptionAvailability(playerId: string) {
  const applications = await getAdoptionApplications(playerId);
  const currentYear = await getCurrentYear(playerId);
  
  for (const app of applications) {
    if (app.status === 'pending' && app.availabilityYear === currentYear) {
      await processAdoptionAvailability(app);
    }
  }
}

async function processAdoptionAvailability(
  application: AdoptionApplication
) {
  const player = await getPlayer(application.playerId);
  
  // 1. Determine child's specific age within range
  const [minAge, maxAge] = application.ageGroup.split('-').map(Number);
  const childAge = Math.floor(Math.random() * (maxAge - minAge + 1)) + minAge;
  
  // 2. Update application status
  application.status = 'available';
  application.childAge = childAge;
  application.notificationSent = true;
  await saveAdoptionApplication(application);
  
  // 3. Notify player
  await sendNotification(player, {
    type: 'family',
    title: 'Adoption Available',
    message: `A child (age ${childAge}) is available for adoption. You can proceed with the adoption if you still meet the requirements by the end of this year.`,
    actionRequired: true,
    actionUrl: '/actions?filter=adoption'
  });
  
  // 4. For age 0-2, adoption happens next year
  // For age 3-9 and 10-17, adoption happens this year
  if (application.ageGroup === '0-2') {
    // Player must accept this year, adoption finalizes next year
    return;
  } else {
    // Can finalize immediately if player accepts
    return;
  }
}

async function acceptAdoption(
  applicationId: string
): Promise<Child> {
  const application = await getAdoptionApplication(applicationId);
  const player = await getPlayer(application.playerId);
  const requirements = getAdoptionRequirements(application.ageGroup);
  
  // 1. Verify still meets requirements
  if (!meetsAdoptionRequirements(player, requirements)) {
    throw new Error('No longer meets adoption requirements');
  }
  
  // 2. Check available time blocks
  const availableTimeBlocks = calculateAvailableTimeBlocks(player);
  if (availableTimeBlocks < requirements.timeBlocks) {
    throw new Error('Not enough available time blocks');
  }
  
  // 3. Create child
  const child: Child = {
    id: generateId(),
    age: application.childAge!,
    isAdopted: true,
    hasChildren: false,
    childrenCount: 0
  };
  
  // 4. Add child to player's family
  player.children.push(child);
  
  // 5. Deduct time blocks
  // (This happens through the action system)
  
  // 6. Update application status
  application.status = 'accepted';
  await saveAdoptionApplication(application);
  
  // 7. Save player
  await savePlayer(player);
  
  // 8. Send notification
  await sendNotification(player, {
    type: 'family',
    title: 'Adoption Complete',
    message: `Congratulations! You have adopted a ${child.age}-year-old child.`,
    persistent: false
  });
  
  // 9. Notify about childcare needs
  if (child.age < 18) {
    await sendNotification(player, {
      type: 'family',
      title: 'Childcare Required',
      message: 'Please review your childcare arrangements for your new child.',
      actionRequired: true,
      actionUrl: '/actions?filter=childcare'
    });
  }
  
  return child;
}

// Helper function for left-skewed random distribution
function generateLeftSkewedRandom(min: number, max: number): number {
  // Generate left-skewed distribution (more likely to be lower values)
  // Using beta distribution approximation
  const random1 = Math.random();
  const random2 = Math.random();
  const skewed = Math.min(random1, random2); // Takes minimum of two randoms
  return Math.floor(skewed * (max - min + 1)) + min;
}
```

**Adoption Action Integration**:

The "Apply to Adopt Child" action is implemented as a special action that:
1. Shows age group selection UI
2. Displays requirements for each age group
3. Only shows age groups player qualifies for
4. Disables action once application is submitted
5. Re-enables when adoption is complete or application expires

**Adoption Timeline Examples**:

Age 0-2 Adoption:
- Year 1: Player applies (age 30, stress 40%)
- Year 3: Child becomes available (notification sent)
- Year 3: Player accepts (must still meet requirements)
- Year 4: Adoption finalizes (2 time blocks charged, child added to family)

Age 3-9 Adoption:
- Year 1: Player applies (age 35, stress 55%)
- Year 1: Child available immediately (notification sent)
- Year 1: Player accepts and adoption finalizes (2 time blocks charged)

Age 10-17 Adoption:
- Year 1: Player applies (age 40, stress 50%)
- Year 1: Child available immediately (notification sent)
- Year 1: Player accepts and adoption finalizes (2 time blocks charged)

**Database Schema for Adoption**:

```sql
CREATE TABLE adoption_applications (
  id VARCHAR(255) PRIMARY KEY,
  player_id VARCHAR(255) NOT NULL,
  age_group VARCHAR(10) NOT NULL,
  application_year INT NOT NULL,
  availability_year INT NOT NULL,
  status VARCHAR(20) NOT NULL,
  child_age INT,
  notification_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);

CREATE INDEX idx_adoption_player ON adoption_applications(player_id);
CREATE INDEX idx_adoption_status ON adoption_applications(status);
```

## 7. UI/UX Design Considerations

### 7.1 Navigation Structure with Themed Names

**Primary Navigation** (always visible):
- **Lemonade** 🏠 - Landing page, instructions, create/join game
- **Squeeze the Day** 🍋 - Actions catalog and cart
- **Harvest** 💰 - Financial management
- **Seeds to Trees** 💼 - Jobs and employment
- **Zest for Learning** 🎓 - Education programs
- **You Won't Get A 🍋** 🚗 - Transportation
- **Home Sour Home** 🏡 - Housing
- **Lemonade Stand** 🥤 - Community pitcher
- **Life's Lemons** 📖 - Scrapbook (end-game)

**Secondary Navigation** (drawer/modal):
- **Tending the Garden** 👤 - Skills, traits, family, timeline
- **Lemon Tea** 💬 - Player chat
- **Planting & Pruning** 🔔 - Alerts and reminders
- **Nutrients** ⚙️ - Audio, display, preferences

**Navigation Bar Elements**:
- Player name and game info
- Health bar (color-coded: green > 70%, yellow 50-70%, red < 50%)
- Stress bar (color-coded: green < 50%, yellow 50-80%, red > 80%)
- Money display (current + projected)
- Mini pitcher (tooltip shows goal and contributions)
- Notification icon with badge count
- Message icon with unread count

**Messaging Interface** (Lemon Tea 💬):
- Single game-wide chat room (no DMs)
- All players in the game session can see all messages
- Real-time message delivery via WebSocket
- Message history scrollable (paginated)
- Emoji reaction picker with 10 common emojis
- Click emoji to add/remove reaction (toggle)
- Display reaction counts and which players reacted
- System messages styled differently (gray, italic)
- Character limit: 500 characters per message
- Timestamps displayed for each message
- Player names color-coded for easy identification

### 7.2 Responsive Design Approach

**Breakpoints**:
- Mobile: < 768px (single column, bottom navigation)
- Tablet: 768px - 1024px (two columns, side navigation)
- Desktop: > 1024px (multi-column, full navigation)

**Mobile Optimizations**:
- Bottom tab bar for primary navigation
- Collapsible sections for profile
- Swipeable cards for actions/jobs/housing
- Touch-friendly buttons (min 44px)
- Simplified comparison view (one item at a time)

**Tablet Optimizations**:
- Side drawer navigation
- Two-column layouts for catalogs
- Split view for comparison
- Larger touch targets

**Desktop Optimizations**:
- Full sidebar navigation
- Multi-column layouts
- Hover states and tooltips
- Keyboard shortcuts
- Side-by-side comparison (3+ items)

### 7.3 Real-time Updates and Notifications

**Notification Types**:
1. **Toast Notifications** (temporary, 3-5 seconds):
   - Lemon contributions
   - Action completed
   - Message received

2. **Persistent Notifications** (navbar badge):
   - Job loss
   - Graduation
   - CPR expiration
   - Health warnings
   - Year started

3. **Modal Notifications** (requires acknowledgment):
   - Card drawn
   - Major life events (marriage, child birth, death)
   - Year transition
   - Game ended
   - Good deed opportunity

**Real-time Update Strategy**:
- WebSocket for instant updates (pitcher, notifications, messages)
- Optimistic UI updates (show immediately, confirm with server)
- Loading states for async operations
- Error recovery with retry logic
- Offline detection with queue for actions

**Deceased Player Experience**:

When a player dies (`isAlive: false`):

1. **Immediate Feedback**:
   - Modal notification: "Game Over - You have passed away at age X"
   - Explanation that they can still chat and view their summary
   - Automatic redirect to scrapbook (Life's Lemons)

2. **Available Features**:
   - **Lemon Tea** (Chat): Full access to send messages and react
   - **Life's Lemons** (Scrapbook): View complete game summary
   - **Lemonade Stand** (Pitcher): View-only access to pitcher status
   - **Tending the Garden** (Profile): View-only access to their stats

3. **Disabled Features**:
   - All action pages grayed out with "Deceased" overlay
   - Navigation items for actions, jobs, education, housing, vehicles show lock icon
   - Clicking disabled items shows tooltip: "This feature is not available after death"
   - Year completion button hidden
   - All financial transactions disabled

4. **Visual Indicators**:
   - Player name shows "💀" emoji or "Deceased" badge
   - Health bar shows "Deceased" instead of 0
   - Navigation bar shows limited options
   - Persistent banner: "You are viewing as a deceased player"

5. **Chat Participation**:
   - Can send messages normally
   - Messages show "(Deceased)" tag next to name
   - Can react to all messages
   - Can view full chat history
   - Other players can see deceased status in chat

6. **Game Summary Access**:
   - Full scrapbook available immediately
   - All statistics and badges visible
   - Housing and vehicle history accessible
   - Retirement summary available
   - Can compare stats with living players

### 7.4 Cart and Action Execution Flow

**Cart Interface**:
- Floating cart button (shows item count)
- Cart drawer/modal with action list
- Real-time validation:
  - Time blocks: `X / Y available` (red if exceeded)
  - Cost: `$X / $Y available` (red if exceeded)
  - Requirements: Show missing requirements
- Remove button for each action
- Clear cart button
- Checkout button (disabled if invalid)

**Action Execution**:
1. Player browses actions (filters, sorts)
2. Player clicks "Add to Cart" or "Express Checkout"
3. If Express: Immediate execution, show results modal
4. If Cart: Add to cart, update totals
5. Player reviews cart, validates
6. Player clicks "Checkout"
7. Loading state while server processes
8. Results modal shows:
   - Lemons earned (animated)
   - Health/stress changes (color-coded)
   - Skill/trait gains (highlighted)
   - Money spent
   - Time blocks used
9. Player dismisses modal, cart clears
10. Call attemptCardDraw(player)

**Visual Feedback**:
- Green for positive effects (lemons, health, skills)
- Red for negative effects (stress, costs)
- Yellow for warnings (low time blocks, low money)
- Animations for lemon contributions
- Progress bars for skills/traits
- Confetti for major achievements

### 7.5 Filtering and Sorting UI

### 7.5 Filtering, Sorting, and Search UI

**Search Bar** (prominent at top of page):
- Text input with search icon
- Placeholder text: "Search actions...", "Search jobs...", "Search programs..."
- Real-time search as user types (debounced)
- Searches in: title
- Clear button (X) appears when text is entered
- Shows result count: "Showing X results for 'search term'"
- Case-insensitive matching

**Search Behavior**:
- **Actions Page**: Searches action name
- **Jobs Page**: Searches job title
- **Education Page**: Searches field and major
- Search works in combination with filters and sorting
- Empty search shows all items (respecting filters)

**Filter Panel** (collapsible sidebar or modal):
- **Category**: Checkboxes for action categories
- **Cost**: Slider (min-max)
- **Time Blocks**: Slider (min-max)
- **Health Impact**: Positive / Negative / Neutral
- **Stress Impact**: Positive / Negative / Neutral
- **Eligibility**: Toggle "Show ineligible" (default: hide)
- **Location**: City / Suburb / Both
- Clear filters button

**Sort Dropdown**:
- Lemons per time block (high to low)
- Lemons per dollar (high to low)
- Cost per time block (low to high)
- Cost (low to high)
- Time blocks (low to high)

**Applied Filters Display**:
- Chips showing active filters
- Search term shown as chip (if active)
- Click to remove individual filter
- Count of results: "Showing X of Y items"

**Combined Search, Filter, and Sort Flow**:
1. User enters search term → Results filtered by text match
2. User applies filters → Results further filtered
3. User selects sort → Filtered results reordered
4. Reset button resets search, filters, and sort

**Search Implementation Notes**:
- Use debouncing (300ms) to avoid excessive API calls
- Minimum 2 characters before searching (optional)
- Show "No results found" message with suggestions
- Preserve search term when navigating away and back
- Search history dropdown

**Search Implementation**:
```typescript
interface SearchParams {
  query?: string;
  filters?: FilterParams;
  sort?: SortParams;
  page?: number;
  limit?: number;
}

async function searchActions(params: SearchParams): Promise<SearchResult<Action>> {
  let actions = await getActionCatalog();
  
  // 1. Apply search filter
  if (params.query && params.query.length >= 2) {
    const searchTerm = params.query.toLowerCase();
    actions = actions.filter(action => 
      action.name.toLowerCase().includes(searchTerm) ||
      action.description.toLowerCase().includes(searchTerm)
    );
  }
  
  // 2. Apply additional filters
  if (params.filters) {
    actions = applyFilters(actions, params.filters);
  }
  
  // 3. Apply sorting
  if (params.sort) {
    actions = applySorting(actions, params.sort);
  }
  
  // 4. Paginate results
  const total = actions.length;
  const page = params.page || 1;
  const limit = params.limit || 50;
  const startIndex = (page - 1) * limit;
  const paginatedActions = actions.slice(startIndex, startIndex + limit);
  
  return {
    items: paginatedActions,
    total,
    page,
    limit,
    hasMore: startIndex + limit < total
  };
}

// Similar implementations for searchJobs() and searchEducationPrograms()


## 8. Security and Data Integrity

## 8. Security and Data Integrity

### 8.1 Authentication Flow - Passphrase-Based Identity

**Authentication Approach**: Simple Username-Based Identity (firstname.lastname)

**Key Principles**:
- Simple identification for small trusted group
- Username format: firstname.lastname (e.g., "amy.smith")
- No passwords or security credentials required
- Per-game display names (can be different from username)
- Game access controlled via 6-character game codes
- Cross-device access via same username

**Data Models**:

```typescript
interface User {
  id: string; // Username in firstname.lastname format
  createdAt: Date;
  lastSeenAt: Date;
}

interface Player {
  id: string;
  userId: string; // Links to User.id
  gameSessionId: string;
  displayName: string; // Chosen for this specific game
  age: number;
  // ... rest of player data
}

interface GameSession {
  id: string;
  code: string; // 6-character random code (e.g., "A3X9K2")
  creatorUserId: string;
  theme?: string; // Game theme selected by creator
  status: 'waiting' | 'active' | 'completed';
  maxPlayers: number;
  playerIds: string[];
  startDate?: Date;
  endDate?: Date;
  createdAt: Date;
}

interface GameHistory {
  userId: string;
  games: {
    gameSessionId: string;
    gameCode: string;
    displayName: string;
    startDate: Date;
    endDate?: Date;
    status: 'active' | 'completed' | 'abandoned';
    finalStats?: any;
  }[];
}
```

**Authentication Flow**:

**First-Time User**:
1. User visits landing page
2. User enters username in firstname.lastname format (e.g., "amy.smith")
3. Client validates format (lowercase, letters only, single period)
4. Client sends `{ username }` to server
5. Server checks if username already exists:
   - If new: Create User record with username as id
   - If exists: Treat as returning user
6. Server generates JWT token containing `userId` (username)
7. Client stores JWT in localStorage
8. User proceeds to game lobby (create or join game)

**Returning User**:
1. User visits landing page
2. User enters their username (firstname.lastname)
3. Client sends `{ username }` to server
4. Server checks if username exists:
   - If exists: Generate JWT token, return user data and game history
   - If not found: Treat as new user (create User record)
5. Client stores JWT in localStorage
6. User sees their game history and can create/join games

**Game Creation Flow**:
1. Authenticated user clicks "Create New Game"
2. User selects game settings:
   - Game theme (optional)
   - Max players (default: 10)
   - Other game configuration
3. User enters display name for this game
4. Server generates random 6-character game code (alphanumeric, uppercase)
5. Server creates GameSession with unique code
6. Server creates Player record linking user to game
7. User receives game code to share with others
8. Game enters "waiting" status until all players join

**Game Join Flow**:
1. Authenticated user clicks "Join Game"
2. User enters 6-character game code
3. Server validates game code:
   - Game exists and is in "waiting" status
   - Game has not reached max players
   - User is not already in this game
4. User enters display name for this game
5. Server creates Player record linking user to game
6. User joins game lobby
7. WebSocket notifies all players in lobby of new player

**Session Management**:
- JWT tokens contain: `{ userId, iat, exp }`
- Token expiration: 7 days (configurable)
- Refresh: Client automatically refreshes token before expiration
- Logout: Client clears localStorage and memory

**Implementation Details**:

```typescript
// Client-side username validation
function validateUsername(username: string): boolean {
  // Must be firstname.lastname format
  // Only lowercase letters and single period
  const usernameRegex = /^[a-z]+\.[a-z]+$/;
  return usernameRegex.test(username);
}

// Server-side authentication
async function authenticateUser(req: Request, res: Response) {
  const { username } = req.body;
  
  // Validate username format
  if (!validateUsername(username)) {
    return res.status(400).json({ 
      error: 'Invalid username format. Use firstname.lastname (e.g., amy.smith)' 
    });
  }
  
  // Check if user exists
  let user = await getUserById(username);
  let isNewUser = false;
  
  if (!user) {
    // Create new user
    user = await createUser({
      id: username,
      createdAt: new Date(),
      lastSeenAt: new Date()
    });
    isNewUser = true;
  } else {
    // Update last seen for returning user
    await updateUserLastSeen(username);
  }
  
  // Get game history for returning users
  const gameHistory = isNewUser ? { userId: username, games: [] } : await getGameHistory(username);
  
  // Generate JWT
  const token = jwt.sign({ userId: username }, process.env.JWT_SECRET, { expiresIn: '7d' });
  
  return res.json({ 
    token, 
    user: { id: user.id, createdAt: user.createdAt },
    gameHistory,
    isNewUser
  });
}

// Generate unique 6-character game code
async function generateGameCode(): Promise<string> {
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude similar chars (I/1, O/0)
  let code: string;
  let isUnique = false;
  
  while (!isUnique) {
    code = '';
    for (let i = 0; i < 6; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    // Check if code already exists
    const existingGame = await getGameByCode(code);
    if (!existingGame) {
      isUnique = true;
    }
  }
  
  return code;
}

// Create new game
async function createGame(req: Request, res: Response) {
  const { userId, displayName, theme, maxPlayers = 10 } = req.body;
  
  // Generate unique game code
  const gameCode = await generateGameCode();
  
  // Create game session
  const gameSession = await db.gameSession.create({
    data: {
      code: gameCode,
      creatorUserId: userId,
      theme,
      maxPlayers,
      status: 'waiting',
      createdAt: new Date()
    }
  });
  
  // Create player record for creator
  const player = await db.player.create({
    data: {
      userId,
      gameSessionId: gameSession.id,
      displayName,
      age: 22, // Starting age
      // ... initialize other player attributes
    }
  });
  
  return res.json({
    gameSession: {
      id: gameSession.id,
      code: gameSession.code,
      theme: gameSession.theme,
      maxPlayers: gameSession.maxPlayers,
      status: gameSession.status
    },
    player: {
      id: player.id,
      displayName: player.displayName
    }
  });
}

// Join existing game
async function joinGame(req: Request, res: Response) {
  const { userId, gameCode, displayName } = req.body;
  
  // Find game by code
  const gameSession = await getGameByCode(gameCode);
  
  if (!gameSession) {
    return res.status(404).json({ error: 'Game not found' });
  }
  
  if (gameSession.status !== 'waiting') {
    return res.status(400).json({ error: 'Game has already started' });
  }
  
  // Check if game is full
  const playerCount = await db.player.count({
    where: { gameSessionId: gameSession.id }
  });
  
  if (playerCount >= gameSession.maxPlayers) {
    return res.status(400).json({ error: 'Game is full' });
  }
  
  // Check if user already in this game
  const existingPlayer = await db.player.findFirst({
    where: { 
      userId,
      gameSessionId: gameSession.id
    }
  });
  
  if (existingPlayer) {
    return res.status(400).json({ error: 'You are already in this game' });
  }
  
  // Create player record
  const player = await db.player.create({
    data: {
      userId,
      gameSessionId: gameSession.id,
      displayName,
      age: 22, // Starting age
      // ... initialize other player attributes
    }
  });
  
  // Notify other players via WebSocket
  io.to(gameSession.id).emit('playerJoined', {
    playerId: player.id,
    displayName: player.displayName
  });
  
  return res.json({
    gameSession: {
      id: gameSession.id,
      code: gameSession.code,
      theme: gameSession.theme,
      maxPlayers: gameSession.maxPlayers,
      status: gameSession.status
    },
    player: {
      id: player.id,
      displayName: player.displayName
    }
  });
}

// Get user's game history
async function getGameHistory(userId: string): Promise<GameHistory> {
  const players = await db.player.findMany({
    where: { userId },
    include: { gameSession: true },
    orderBy: { createdAt: 'desc' }
  });
  
  return {
    userId,
    games: players.map(player => ({
      gameSessionId: player.gameSessionId,
      gameCode: player.gameSession.code,
      displayName: player.displayName,
      startDate: player.gameSession.startDate,
      endDate: player.gameSession.endDate,
      status: player.gameSession.status,
      finalStats: player.gameSession.status === 'completed' ? {
        finalAge: player.age,
        finalMoney: player.money,
        finalHealth: player.health,
        finalStress: player.stress,
        survived: player.isAlive
      } : undefined
    }))
  };
}
```

**Client-Side Storage**:
- JWT token: localStorage (persistent across sessions)
- Username: Stored in JWT token payload
- User can access from any device by entering same username

**Security Considerations**:
- No password protection (designed for small trusted group)
- Username format validation prevents malformed entries
- Game codes provide access control to specific games
- Rate limiting on authentication endpoint (10 attempts per 15 minutes)
- Rate limiting on game creation (5 games per hour per user)
- JWT tokens have expiration and can be revoked server-side if needed
- Anyone can access any username (trust-based system)

**UX Flow**:

Landing Page:
```
┌─────────────────────────────────────┐
│         Welcome to Lemonade!        │
│                                     │
│  Enter your username to continue    │
│  (firstname.lastname)               │
│  [____________________________]     │
│                                     │
│  [Continue]                         │
│                                     │
│  Example: amy.smith                 │
└─────────────────────────────────────┘
```

Game Lobby (After Login):
```
┌─────────────────────────────────────┐
│         Your Game History           │
│                                     │
│  Active Games:                      │
│  • Code: A3X9K2 (as "Alex")         │
│    Year 5, Age 26                   │
│    [Continue]                       │
│                                     │
│  Completed Games:                   │
│  • Code: B7M4N1 (as "Jordan")       │
│    Survived to age 65               │
│    [View Summary]                   │
│                                     │
│  [Create New Game]                  │
│  [Join Game with Code]              │
└─────────────────────────────────────┘
```

Create Game:
```
┌─────────────────────────────────────┐
│         Create New Game             │
│                                     │
│  Your Display Name:                 │
│  [____________________________]     │
│                                     │
│  Game Theme (optional):             │
│  [▼ Select Theme _______________]   │
│                                     │
│  Max Players:                       │
│  [▼ 10 _________________________]   │
│                                     │
│  [Create Game]                      │
└─────────────────────────────────────┘
```

After Game Created:
```
┌─────────────────────────────────────┐
│      Game Created Successfully!     │
│                                     │
│  Your Game Code: A3X9K2             │
│  [Copy Code]                        │
│                                     │
│  Share this code with friends       │
│  so they can join your game!        │
│                                     │
│  Waiting for players... (1/10)      │
│                                     │
│  Players:                           │
│  • Alex (You)                       │
│                                     │
│  [Start Game] (disabled until 2+)   │
└─────────────────────────────────────┘
```

Join Game:
```
┌─────────────────────────────────────┐
│          Join Existing Game         │
│                                     │
│  Game Code:                         │
│  [______]                           │
│                                     │
│  Your Display Name:                 │
│  [____________________________]     │
│                                     │
│  [Join Game]                        │
└─────────────────────────────────────┘
```

### 8.2 Authorization Middleware

```typescript
async function authorize(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.playerId = decoded.playerId;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

async function authorizeGameSession(req: Request, res: Response, next: NextFunction) {
  const { sessionId } = req.params;
  const playerId = req.playerId;
  
  const session = await getSession(sessionId);
  if (!session.playerIds.includes(playerId)) {
    return res.status(403).json({ error: 'Not a member of this game session' });
  }
  
  next();
}

async function validatePlayerAlive(req: Request, res: Response, next: NextFunction) {
  const playerId = req.playerId;
  const player = await getPlayer(playerId);
  
  if (!player.isAlive) {
    return res.status(403).json({ 
      error: 'Action not allowed for deceased players',
      message: 'You can only access chat and view your game summary.'
    });
  }
  
  next();
}

// Apply to gameplay endpoints
app.post('/api/actions/execute', authorize, validatePlayerAlive, executeActions);
app.post('/api/jobs/:id/apply', authorize, validatePlayerAlive, applyForJob);
app.post('/api/education/enroll', authorize, validatePlayerAlive, enrollInEducation);
// ... etc for all gameplay actions

// Chat and scrapbook remain accessible without validatePlayerAlive
app.post('/api/messages', authorize, sendMessage); // No validatePlayerAlive
app.get('/api/scrapbook/:playerId', authorize, getScrapbook); // No validatePlayerAlive
```

### 8.3 Input Validation

```typescript
import { z } from 'zod';

const executeActionSchema = z.object({
  actionIds: z.array(z.string()).min(1).max(20),
  playerId: z.string().uuid()
});

async function executeActions(req: Request, res: Response) {
  const validation = executeActionSchema.safeParse(req.body);
  
  if (!validation.success) {
    return res.status(400).json({ 
      error: 'Invalid request',
      details: validation.error.errors
    });
  }
  
  // Process actions...
}
```

### 8.4 Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests, please try again later'
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 login attempts per window
  message: 'Too many login attempts, please try again later'
});

app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);
```

## 9. Testing Strategy

### 9.1 Unit Tests

**Coverage Areas**:
- Game engine calculations (health, stress, time blocks, taxes)
- Random number generation and distributions
- Eligibility checking logic
- Financial calculations (loans, inflation, retirement)
- Good deed multiplier calculations

**Testing Framework**: Jest with TypeScript

### 9.2 Integration Tests

**Coverage Areas**:
- API endpoints (CRUD operations)
- Database operations (create, read, update, delete)
- WebSocket events (connection, disconnection, broadcasting)
- Authentication and authorization flows
- Year cycle processing

### 9.3 End-to-End Tests

**Coverage Areas**:
- Complete game flow (create game → play year → complete year)
- Multiplayer coordination (multiple players, year transitions)
- Action execution and cart management
- Good deed opportunities and responses
- Game ending scenarios

**Testing Framework**: Playwright or Cypress

### 9.4 Performance Tests

**Coverage Areas**:
- Load testing (10+ concurrent players)
- Database query performance
- WebSocket connection limits
- API response times
- Memory usage and leaks

**Testing Framework**: k6 or Artillery

## 10. Deployment and DevOps

### 10.1 Development Environment

```yaml
# docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: lemonade_dev
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
  
  redis:
    image: redis:7
    ports:
      - "6379:6379"
  
  backend:
    build: ./backend
    ports:
      - "3001:3001"
    environment:
      DATABASE_URL: postgresql://dev:dev@postgres:5432/lemonade_dev
      REDIS_URL: redis://redis:6379
    depends_on:
      - postgres
      - redis
    volumes:
      - ./backend:/app
      - /app/node_modules
  
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      REACT_APP_API_URL: http://localhost:3001
    volumes:
      - ./frontend:/app
      - /app/node_modules

volumes:
  postgres_data:
```

### 10.2 Production Deployment

**Infrastructure**:
- Cloud provider (AWS, GCP, or Azure)
- Container orchestration (Kubernetes or ECS)
- Managed database (RDS PostgreSQL)
- Managed cache (ElastiCache Redis)
- Load balancer (ALB or cloud LB)
- CDN (CloudFront or CloudFlare)

**CI/CD Pipeline**:
1. Code push to Git repository
2. Run linting and type checking
3. Run unit tests
4. Build Docker images
5. Run integration tests
6. Push images to container registry
7. Deploy to staging environment
8. Run E2E tests
9. Deploy to production (manual approval)

### 10.3 Monitoring and Logging

**Logging**:
- Log levels: ERROR, WARN, INFO, DEBUG

## 11. Future Enhancements

### 11.1 Theme System (Requirement 61)

**Architecture for Multiple Themes**:
- Theme configuration files (JSON or YAML)
- Theme-specific assets (colors, images, sounds)
- Theme-specific content (jobs, actions, cards)
- Theme selection during game creation
- Dynamic loading of theme data

**Example Theme Structure**:
```typescript
interface Theme {
  id: string;
  name: string;
  description: string;
  
  // Visual
  colors: ColorPalette;
  images: ImageAssets;
  sounds: SoundAssets;
  
  // Content
  jobs: Job[];
  actions: Action[];
  cards: Card[];
  housing: Housing[];
  vehicles: Vehicle[];
  
  // Game rules (optional overrides)
  rules?: Partial<GameRules>;
}
```

### 11.2 Additional Features

**Potential Enhancements**:
- Achievements and badges system
- Leaderboards (most lemons, longest life, etc.)
- AI players for solo mode

## 12. Requirement Coverage Matrix

This design addresses all 61 requirements:

**Core Game Systems**:
- ✅ Req 1: Game Session Management (Section 2.2, 5.1)
- ✅ Req 2: Player Profile Initialization (Section 3.1, 6.6)
- ✅ Req 3: Year Cycle Management (Section 6.1)
- ✅ Req 4: Time Block System (Section 6.2)
- ✅ Req 5: Health and Stress Management (Section 6.3, 6.4)
- ✅ Req 6: Financial System (Section 6.5)
- ✅ Req 7: Lemonade Pitcher System (Section 3.1, 6.8)
- ✅ Req 8: Action System (Section 3.2, 5.1)
- ✅ Req 9: Card System (Section 3.8, 6.6)
- ✅ Req 10: Education System (Section 3.4, 5.1)
- ✅ Req 11: Employment System (Section 3.3, 5.1)
- ✅ Req 12: Housing System (Section 3.5, 5.1)
- ✅ Req 13: Transportation System (Section 3.5, 5.1)
- ✅ Req 14: Relationship and Family System (Section 3.6, 5.1)
- ✅ Req 15: Retirement System (Section 3.1, 6.5)
- ✅ Req 16: Aging and Death System (Section 6.3)
  - Player death at health ≤ 5 (20% chance)
  - Post-death: Chat and scrapbook access only
  - All gameplay features disabled for deceased players
  - Game ends when all players deceased
- ✅ Req 17: Pet System (Section 3.6)
- ✅ Req 18: Expense Management (Section 5.1, 6.5)
- ✅ Req 19: Good Deed System (Section 6.8)
- ✅ Req 20: Inflation System (Section 6.7)

**UI/UX and Features**:
- ✅ Req 21: Notification System (Section 3.9, 7.3)
- ✅ Req 22: Filtering and Sorting System (Section 7.5)
- ✅ Req 23: Profile and Progress Tracking (Section 2.1, 3.1)
- ✅ Req 24: Scrapbook and End Game Summary (Section 3.10, 5.1)
- ✅ Req 25: Messaging System (Section 2.3, 5.1)
- ✅ Req 26: Career Progression Systems (Section 3.10)
- ✅ Req 27: Spouse Management (Section 3.6)
- ✅ Req 28: Savings and Investment System (Section 3.7)
- ✅ Req 29: Insurance System (Section 6.5)
- ✅ Req 30: Grocery and Bulk Buying System (Section 6.5)
- ✅ Req 31: Internship System (Section 3.2)
- ✅ Req 32: Childcare Calculation System (Section 6.2)
- ✅ Req 33: Academic Action System (Section 3.2, 3.4)
- ✅ Req 34: Skill and Trait Progression System (Section 3.1)
- ✅ Req 35: PTO and Time Off System (Section 6.2)
- ✅ Req 36: Comparison and Planning Tools (Section 7.5)
- ✅ Req 37: Tax Calculation System (Section 6.5)
- ✅ Req 38: Pension System (Section 3.3)
- ✅ Req 39: Debt Stress System (Section 6.4)
- ✅ Req 40: Expense Forecasting System (Section 5.1, 6.5)

**Technical Requirements**:
- ✅ Req 41: Cookie and Preference Storage (Section 4.3)
- ✅ Req 42: Home Improvement System (Section 3.5)
- ✅ Req 43: Certification and License System (Section 3.1)
- ✅ Req 44: Seasonal and Summer Job System (Section 3.3)
- ✅ Req 45: Job Benefits and Perks System (Section 3.3)
- ✅ Req 46: Multi-Job System (Section 3.3)
- ✅ Req 47: Location-Based Restrictions (Section 3.2, 3.3, 3.5)
- ✅ Req 48: Wedding and Marriage Costs (Section 3.6)
- ✅ Req 49: Data Persistence and State Management (Section 2.4, 4.3)
- ✅ Req 50: User Interface Navigation (Section 7.1)
- ✅ Req 51: Tutorial and Instructions (Section 2.1)
- ✅ Req 52: Accessibility and Responsiveness (Section 7.2)
- ✅ Req 53: Performance and Scalability (Section 4.5)
- ✅ Req 54: Error Handling and Validation (Section 8.3)
- ✅ Req 55: Random Number Generation and Probability (Section 6.6)
- ✅ Req 56: Animation and Visual Feedback (Section 7.3, 7.4)
- ✅ Req 57: Sound and Audio (Section 1.2)
- ✅ Req 58: Game Configuration and Settings (Section 5.1)
- ✅ Req 60: Admin and Moderation Features (Section 5.1, 8.2)
- ✅ Req 61: Theme (Section 11.1)

## 13. Implementation Roadmap

**Phase 1: Foundation** (Weeks 1-4)
- Set up project structure and development environment
- Implement authentication and authorization
- Create database schema and migrations
- Build basic REST API endpoints
- Set up WebSocket server

**Phase 2: Core Game Engine** (Weeks 5-8)
- Implement player profile initialization
- Build time block calculator
- Create health and stress calculation engines
- Implement financial calculator (taxes, loans, inflation)
- Build random event generator

**Phase 3: Game Systems** (Weeks 9-14)
- Implement action system
- Build job system
- Create education system
- Implement housing and transportation
- Build relationship and family system

**Phase 4: Multiplayer** (Weeks 15-18)
- Implement year cycle coordination
- Build lemonade pitcher system
- Create good deed system
- Implement real-time notifications
- Build messaging system

**Phase 5: UI Development** (Weeks 19-24)
- Build navigation and layout
- Create action catalog and cart
- Implement profile and progress tracking
- Build financial management UI
- Create comparison tools

**Phase 6: Polish and Testing** (Weeks 25-28)
- Implement animations and visual feedback
- Add sound effects
- Comprehensive testing (unit, integration, E2E)
- Performance optimization
- Bug fixes

**Phase 7: Deployment** (Weeks 29-30)
- Set up production infrastructure
- Deploy to staging
- Final testing and QA
- Production deployment
- Monitoring and logging setup

---

**Document Version**: 1.0  
**Last Updated**: 2026  
**Status**: Ready for Implementation
