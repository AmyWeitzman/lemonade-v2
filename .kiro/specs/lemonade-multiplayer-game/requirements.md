# Requirements Document

## Introduction

Lemonade is a multiplayer web-based life simulation game where players navigate through life from age 18 onwards, making decisions about education, careers, relationships, housing, and activities. Players work together to fill a community lemonade pitcher with lemons earned through positive life actions. The game emphasizes cooperative gameplay, life planning, and balancing health, stress, finances, and personal growth.

## Glossary

- **Player**: A human user participating in the game
- **Game_System**: The core game engine managing state, rules, and progression
- **Lemonade_Pitcher**: The shared community goal tracker that all players contribute to
- **Time_Block**: A unit of time representing activities during a year (60 total per year)
- **Lemon**: The game's cooperative currency earned through actions and contributed to the pitcher
- **Action**: An activity a player can perform during their year
- **Card**: A random event that occurs to a player
- **Profile**: A player's character attributes including skills, traits, health, and stress
- **Year**: One game cycle from birthday to birthday
- **Express_Checkout**: Immediate action execution without cart
- **Cart**: A collection of actions to be executed together
- **Good_Deed_Multiplier**: A bonus multiplier based on number of good deeds performed
- **Bad_Deed_Multiplier**: A penalty multiplier based on number of bad deeds performed

## Requirements

### Requirement 1: Game Session Management

**User Story:** As a player, I want to create or join multiplayer game sessions, so that I can play with friends.

#### Acceptance Criteria

1. THE Game_System SHALL allow players to create new game sessions
2. THE Game_System SHALL allow players to join existing game sessions (if first end of year has not been completed yet)
3. THE Game_System SHALL assign unique identifiers to each game session
4. THE Game_System SHALL track all players in a game session
5. THE Game_System SHALL allow players to leave a game session
6. WHEN a player leaves, THE Game_System SHALL adjust the Lemonade_Pitcher goal accordingly
7. THE Game_System SHALL preserve lemons already contributed by departed players


### Requirement 2: Player Profile Initialization

**User Story:** As a new player, I want my character to be initialized with random attributes and parent contributions, so that each playthrough is unique.

#### Acceptance Criteria

1. WHEN a player starts a new game, THE Game_System SHALL randomly assign trait values within specified ranges
2. WHEN a player starts a new game, THE Game_System SHALL randomly assign skill values within specified ranges
3. THE Game_System SHALL use bell curve distribution for most traits and skills
4. THE Game_System SHALL use right-skewed distribution for art, music, and home repair skills
5. WHEN initializing, THE Game_System SHALL roll a 10-sided die to determine parent contributions
6. THE Game_System SHALL assign vehicle, college funding, housing age limit, and wedding contribution based on die roll
7. THE Game_System SHALL calculate starting money from personal savings, parent wealth, and organization skill
8. THE Game_System SHALL assign chronic health conditions with 20% probability at game start
9. THE Game_System SHALL allow players to adjust traits by up to 50% total with maximum 10% per trait
10. THE Game_System SHALL allow players to adjust skills by up to 10% total with maximum 2% per skill

### Requirement 3: Year Cycle Management

**User Story:** As a player, I want the game to progress through yearly cycles, so that I can experience life progression.

#### Acceptance Criteria

1. THE Game_System SHALL wait for all players to complete their year before starting the next year
2. WHEN all players complete expenses, THE Game_System SHALL start the next year for all players
3. WHEN a new year starts, THE Game_System SHALL notify all players with a birthday message
4. THE Game_System SHALL increment each player's age by one year
5. THE Game_System SHALL process beginning-of-year events before allowing player actions
6. THE Game_System SHALL process end-of-year expenses after all actions are completed

### Requirement 4: Time Block System

**User Story:** As a player, I want to allocate my time across sleep, work, childcare, and activities, so that I can manage my schedule realistically.

#### Acceptance Criteria

1. THE Game_System SHALL allocate 60 Time_Blocks per year to each player
2. THE Game_System SHALL assign 20 Time_Blocks to sleep by default
3. WHEN a player has a job, THE Game_System SHALL allocate Time_Blocks based on job requirements
4. WHEN a player has children under 18, THE Game_System SHALL calculate childcare Time_Blocks
5. THE Game_System SHALL calculate remaining Time_Blocks for activities
6. WHEN a player uses PTO, THE Game_System SHALL convert job Time_Blocks to activity Time_Blocks
7. WHEN a player stays up late, THE Game_System SHALL convert 1 sleep Time_Block to 1 activity Time_Block
8. THE Game_System SHALL display Time_Block allocation visually to the player


### Requirement 5: Health and Stress Management

**User Story:** As a player, I want my health and stress to be tracked and affected by my choices, so that I experience realistic consequences.

#### Acceptance Criteria

1. THE Game_System SHALL initialize player health between 70% and 100% using left-skewed distribution
2. THE Game_System SHALL reset stress to 0% at the beginning of each year
3. WHEN calculating stress, THE Game_System SHALL add stress from job, college, cards, and debt
4. WHEN stress tolerance is high (67-100%), THE Game_System SHALL decrease stress by 15%
5. WHEN stress tolerance is low (<34%), THE Game_System SHALL increase stress by 10%
6. WHEN health is >= 70% and stress > 90%, THE Game_System SHALL decrease health by 2%
7. WHEN health is >= 70% and stress > 80%, THE Game_System SHALL decrease health by 1%
8. WHEN health is >= 50% and < 70% and stress > 85%, THE Game_System SHALL decrease health by 3%
9. WHEN health is >= 50% and < 70% and stress > 75%, THE Game_System SHALL decrease health by 2%
10. WHEN health is < 50% and stress > 80%, THE Game_System SHALL decrease health by 4%
11. WHEN health is < 50% and stress > 70%, THE Game_System SHALL decrease health by 3%
12. WHEN a player has chronic health conditions, THE Game_System SHALL set max health to 100% minus 15% per condition
13. WHEN a player with chronic conditions performs health actions, THE Game_System SHALL grant 80% of normal health gains (rounded up)
14. THE Game_System SHALL track temporary and permanent health changes separately
15. WHEN permanent health loss occurs, THE Game_System SHALL decrease max health accordingly

### Requirement 6: Financial System

**User Story:** As a player, I want to manage my money, loans, and expenses, so that I can make financial decisions.

#### Acceptance Criteria

1. THE Game_System SHALL track player's current money separately from retirement savings
2. THE Game_System SHALL track player's projected income for the year separately from current money but player can spend current money + projected income (projected income may fluctuate based on job changes, etc)
3. THE Game_System SHALL calculate and deduct taxes using progressive tax brackets
4. THE Game_System SHALL apply 8% annual interest to all loans
5. THE Game_System SHALL require 5% minimum annual loan payment
6. WHEN a player cannot afford minimum loan payment, THE Game_System SHALL not let player pay end of year expenses until player has accounted for that payment (ex: downgrading house/car, adjusting childcare, getting more loans)
7. THE Game_System SHALL prevent players from having negative money balances
8. WHEN a player cannot afford an expense, THE Game_System SHALL not let player pay end of year expenses until player has accounted for expense costs (ex: downgrading house/car, adjusting childcare, getting more loans)
9. THE Game_System SHALL calculate tax preparation fees based on filing complexity
10. WHEN filing is simple, THE Game_System SHALL waive tax preparation fees
11. WHEN a player or spouse has accounting experience, THE Game_System SHALL waive tax preparation fees
12. THE Game_System SHALL allow players to pay expenses from regular money or retirement savings (using retirement savings early (before age 65) incurs penalty of 10% tax on the amount used, charged the following year)


### Requirement 7: Lemonade Pitcher System

**User Story:** As a player, I want to contribute lemons to a shared community pitcher, so that we can work together toward a common goal.

#### Acceptance Criteria

1. THE Game_System SHALL maintain one Lemonade_Pitcher per game session
2. THE Game_System SHALL calculate pitcher capacity based on number of living players
3. WHEN players are ages 20-22, THE Game_System SHALL require 10 lemons per player
4. WHEN players are ages 23-30, THE Game_System SHALL require 20 lemons per player
5. WHEN players are ages 31-50, THE Game_System SHALL require 40 lemons per player
6. WHEN players are ages 51-65, THE Game_System SHALL require 60 lemons per player
7. WHEN players are ages 66+, THE Game_System SHALL require 80 lemons per player
8. THE Game_System SHALL display current lemons, yearly goal, and recommended contribution per player
9. WHEN the community fails to meet the yearly goal, THE Game_System SHALL grant one grace year
10. WHEN the community fails to meet the goal after grace year, THE Game_System SHALL end the game
11. THE Game_System SHALL add lemons to the pitcher immediately when earned
12. WHEN a player leaves the game, THE Game_System SHALL recalculate pitcher capacity but preserve existing lemons

### Requirement 8: Action System

**User Story:** As a player, I want to perform various actions during my year, so that I can earn lemons, improve skills, and manage my life.

#### Acceptance Criteria

1. THE Game_System SHALL provide a catalog of available actions
2. THE Game_System SHALL filter actions based on player eligibility requirements (ex: skills, traits, health) by default (checkbox), but players can uncheck to see everything
3. WHILE a player is ineligble for an action, THE Game_System SHALL disable the action
4. THE Game_System SHALL support Express_Checkout actions that execute immediately
5. THE Game_System SHALL support Cart actions that can be batched together
6. WHEN a player adds actions to cart, THE Game_System SHALL validate total Time_Block usage
7. WHEN a player adds actions to cart, THE Game_System SHALL validate total cost
8. THE Game_System SHALL apply action results including lemon gains, skill changes, stress changes, and health changes
9. THE Game_System SHALL track action frequency limits (once per year, multiple times, etc.)
10. THE Game_System SHALL apply senior discounts when player age >= 65
11. THE Game_System SHALL calculate action costs including per-person and per-time-block costs
12. job, childcare, spouse


### Requirement 9: Card System

**User Story:** As a player, I want random events to occur during my year, so that the game feels dynamic and unpredictable.

#### Acceptance Criteria

1. THE Game_System SHALL draw random cards for players during each year
2. THE Game_System SHALL weight card selection based on card frequency values
3. WHEN a card has eligibility requirements, THE Game_System SHALL only draw it for qualified players
4. THE Game_System SHALL apply card effects including costs, health changes, stress changes, and lemon opportunities
5. WHEN a card offers a Good_Deed opportunity, THE Game_System SHALL notify other players
6. WHEN other players respond to Good_Deed opportunities, THE Game_System SHALL apply Good_Deed_Multiplier
7. WHEN a player declines a Good_Deed opportunity, THE Game_System SHALL apply Bad_Deed_Multiplier penalty
8. THE Game_System SHALL track temporary versus permanent health changes from cards
9. WHEN a card affects insurance rates, THE Game_System SHALL apply changes for the current year
10. THE Game_System SHALL differentiate between good cards and bad cards in presentation

### Requirement 10: Education System

**User Story:** As a player, I want to pursue education to gain skills and qualify for better jobs, so that I can advance my career.

#### Acceptance Criteria

1. THE Game_System SHALL allow players to apply to educational programs
2. WHEN a player applies, THE Game_System SHALL check skill and trait requirements
3. WHEN requirements are not met, THE Game_System SHALL reject the application with hints
4. WHEN requirements are met, THE Game_System SHALL accept the player into the program
5. THE Game_System SHALL allow players to choose full-time or part-time enrollment
6. THE Game_System SHALL grant skills based on program type and enrollment status
7. WHEN enrolled full-time, THE Game_System SHALL grant full skill percentages per year
8. WHEN enrolled part-time, THE Game_System SHALL grant half skill percentages per year (round to 2 decimal places)
9. THE Game_System SHALL charge tuition based on program type and enrollment status
10. THE Game_System SHALL allow scholarship applications once per year
11. WHEN scholarship requirements are met, THE Game_System SHALL award scholarship funds
12. THE Game_System SHALL allow players to pay tuition with scholarships, parent contributions, personal money, or loans
13. THE Game_System SHALL check graduation requirements each year
14. WHEN graduation requirements are met, THE Game_System SHALL award the degree and notify the player
15. THE Game_System SHALL allow players to change majors or drop out
16. THE Game_System SHALL track academic progress including general education, field classes, and major classes


### Requirement 11: Employment System

**User Story:** As a player, I want to find and maintain employment to earn income, so that I can support myself financially.

#### Acceptance Criteria

1. THE Game_System SHALL provide a catalog of available jobs
2. THE Game_System SHALL filter jobs based on education, skill, and trait requirements
3. WHEN a player applies for a job, THE Game_System SHALL check all requirements
4. WHEN requirements are met, THE Game_System SHALL assign the job to the player 
5. WHEN a player is assigned a job, convert job's time blocks from action time blocks (up to remaining time blocks available) - if player had a previous job, only worked half of that job's time blocks
6. WHEN a player is assigned a job, immediately adjust their projected income to be only half of previous job income for the year if applicable and then add in percentage of new job salary based on time blocks worked in that job that year
7. THE Game_System SHALL pay salary at the end of each year when expenses are paid
8. THE Game_System SHALL apply raises based on job raise schedule
9. WHEN organization < 25% or communication < 25%, THE Game_System SHALL withhold raises for one year - if meet raise requirements the following year, play gets their raise and their raise timeline is realigned to that year
10. WHEN organization < 25% or communication < 25% for two consecutive years, THE Game_System SHALL terminate employment
11. THE Game_System SHALL allocate Time_Blocks based on job requirements
12. THE Game_System SHALL apply stress based on job stress level
13. THE Game_System SHALL grant PTO days based on job benefits
14. THE Game_System SHALL apply annual skill and trait gains from job experience
15. WHEN a job has health requirements, THE Game_System SHALL check them annually
16. WHEN health requirements are not met, THE Game_System SHALL grant one grace year
17. WHEN health requirements are not met after grace year, THE Game_System SHALL terminate employment
18. THE Game_System SHALL allow part-time employment for eligible jobs
19. THE Game_System SHALL allow players to quit jobs voluntarily by removing it from their cart
20. THE Game_System SHALL track how long a player has had each job in time blocks

### Requirement 12: Housing System

**User Story:** As a player, I want to select and manage housing, so that I have a place to live.

#### Acceptance Criteria

1. THE Game_System SHALL provide a catalog of available housing options
2. THE Game_System SHALL provide filters for housing based on location, capacity, and restrictions
3. WHEN a player selects housing, THE Game_System SHALL validate occupancy limits
4. THE Game_System SHALL enforce recommended and legal maximum occupancy
5. THE Game_System SHALL enforce pet limits based on housing type
6. THE Game_System SHALL charge rent annually or cost based on housing type
7. THE Game_System SHALL charge utilities based on housing size and number of occupants
8. THE Game_System SHALL charge insurance for owned homes
9. THE Game_System SHALL apply housing inflation annually
10. WHEN a player sells owned housing, THE Game_System SHALL calculate current market value
11. THE Game_System SHALL enforce age restrictions for parent housing
12. THE Game_System SHALL enforce college enrollment requirements for dorm housing
13. THE Game_System SHALL apply stress when changing housing


### Requirement 13: Transportation System

**User Story:** As a player, I want to select and manage transportation, so that I can travel to work and activities.

#### Acceptance Criteria

1. THE Game_System SHALL provide a catalog of available transportation options
2. THE Game_System SHALL provide filters for transportation based on capacity and type
3. WHEN a player selects transportation, THE Game_System SHALL charge purchase or annual cost
4. THE Game_System SHALL charge annual insurance based on vehicle type and age
5. THE Game_System SHALL charge annual gas costs based on fuel type
6. THE Game_System SHALL charge annual maintenance based on vehicle age
7. WHEN a player has mechanic experience, THE Game_System SHALL apply 80% maintenance discount
8. THE Game_System SHALL apply transportation inflation annually
9. WHEN a player sells transportation, THE Game_System SHALL calculate depreciated value
10. THE Game_System SHALL track vehicle age for insurance and maintenance calculations
11. THE Game_System SHALL enforce bike restrictions preventing inter-area travel
12. THE Game_System SHALL charge public transit costs per person annually
13. THE Game_System SHALL apply stress when changing transportation

### Requirement 14: Relationship and Family System

**User Story:** As a player, I want to form relationships, get married, and have children, so that I can experience family life.

#### Acceptance Criteria

1. THE Game_System SHALL allow single players to find romantic partners
2. WHEN finding love, THE Game_System SHALL generate a spouse with attributes
3. THE Game_System SHALL allow married players to get divorced
4. WHEN divorcing, THE Game_System SHALL split assets and adjust housing eligibility
5. THE Game_System SHALL allow players to try to have children when age <= 45
6. WHEN trying for children, THE Game_System SHALL use probability to determine success
7. THE Game_System SHALL track children's ages and apply age-based effects
8. THE Game_System SHALL calculate childcare Time_Block requirements based on children's ages
9. THE Game_System SHALL charge childcare costs based on selected childcare option
10. THE Game_System SHALL charge annual child expenses for children under 18
11. THE Game_System SHALL allow players to adopt children when requirements are met
12. WHEN adoption requirements are met, THE Game_System SHALL add adopted child to family
13. THE Game_System SHALL roll for grandchildren when player's children are ages 25-40
14. THE Game_System SHALL allow players to interact with grandchildren through actions
15. THE Game_System SHALL allow players to adopt children through adoption action
16. WHEN adoption is successful, THE Game_System SHALL add adopted child to family and track as adopted

### Requirement 14A: Dating App System (Find Love Action)

**User Story:** As a single player, I want to use a dating app to find a compatible spouse by specifying my preferences, so that I can get married and build a family.

#### Acceptance Criteria

1. THE Game_System SHALL provide a "Find Love" action for single players
2. WHEN using Find Love action, THE Game_System SHALL require player to have >= 50 communication
3. WHEN using Find Love action, THE Game_System SHALL require player to have >= 50 compassion
4. THE Game_System SHALL allow players to input desired spouse characteristics including money, salary, vehicle type, housing type, PTO, and education interest (major)
5. THE Game_System SHALL generate 3 spouse candidates that are the same age as the player
6. WHEN generating candidates, THE Game_System SHALL ensure each candidate matches at least one player-specified criteria
7. THE Game_System SHALL exclude actor, author, ride-share driver, and musician jobs from spouse candidates
8. WHEN player is over age 65, THE Game_System SHALL mark candidates as RETIRED instead of showing job info
9. THE Game_System SHALL determine candidate education based on age with 50% chance of no degree and 50% chance of degree
10. WHEN candidate has degree, THE Game_System SHALL restrict degree type based on age: <20 (high school), >=20 (associates), >=22 (bachelors), >=24 (masters), >=30 (PhD)
11. THE Game_System SHALL exclude vocational and professional school degrees from spouse candidates
12. THE Game_System SHALL display candidate profile including job info (salary, raise, degrees, PTO), money, savings, loans, age, vehicle type, housing type, education interest, and initial compatibility score
13. THE Game_System SHALL calculate initial compatibility score based on player's stress, compassion, patience, stress tolerance, and communication, plus random 0-2 points for candidate
14. THE Game_System SHALL calculate candidate money as total earnings minus savings minus X% of total earnings (X=90 if salary <=35k, X=80 if <=70k, X=60 if <=105k, X=50 if <=150k)
15. THE Game_System SHALL calculate candidate retirement savings based on salary bracket (<=35k: 1-5%/yr, <=70k: 3-10%/yr, <=105k: 5-15%/yr, <=150k: 15-20%/yr)
16. THE Game_System SHALL calculate candidate debt by rolling 5-sided die for multiplier (1=100%, 2=75%, 3=50%, 4=25%, 5=0%) applied to total cost of degrees
17. WHEN player selects a candidate, THE Game_System SHALL execute express checkout to finalize marriage (add spouse to family, add in their money, etc) and then add a spouse item to the cart (to adjust their school, job, etc)
18. WHEN spouse item is in cart, THE Game_System SHALL disable Find Love action
19. WHEN player does not select a candidate, THE Game_System SHALL allow Find Love action to be used again that year
20. WHEN player does not select a candidate, THE Game_System SHALL charge 2 time blocks and grant 1 lemon
21. WHEN player selects a candidate and gets married, THE Game_System SHALL charge 6 time blocks and grant 3 lemons
22. THE Game_System SHALL display parent wedding contribution amount before marriage is finalized
23. WHEN getting married for first time, THE Game_System SHALL charge $15,000 to player (half of $30,000 total) minus parent contribution
24. WHEN remarrying, THE Game_System SHALL charge $7,500 to player (half of $15,000 total) with no parent contribution
25. WHEN marriage is finalized, THE Game_System SHALL combine player and spouse money and retirement savings
26. WHEN marriage is finalized, THE Game_System SHALL add spouse's loans to player's loan list
27. WHEN marriage is finalized, THE Game_System SHALL automatically add Spouse item to player's cart for managing spouse's job, school, and vehicle
28. THE Game_System SHALL ensure spouses do not come with children
29. WHEN married, THE Game_System SHALL grant 1% increase to communication, compassion, and patience each year (max 20% total across all marriages)
30. THE Game_System SHALL track total years married across all marriages for trait gain limits

### Requirement 14B: Marriage Compatibility and Divorce System

**User Story:** As a married player, I want my marriage to have a compatibility score that affects relationship stability, and I want the option to divorce with fair asset division.

#### Acceptance Criteria

1. THE Game_System SHALL calculate marriage compatibility score annually
2. WHEN calculating compatibility, THE Game_System SHALL add 2 points if player had no debt stress for past 2 years
3. WHEN calculating compatibility, THE Game_System SHALL add 1 point if stress < 90%
4. WHEN calculating compatibility with kids under 18, THE Game_System SHALL add 2 points if at least 1 family action done in past 2 years
5. WHEN calculating compatibility without kids under 18, THE Game_System SHALL add 2 points if at least 2 family actions done in past 2 years
6. WHEN calculating compatibility, THE Game_System SHALL add 1 point if compassion >= 80%
7. WHEN calculating compatibility, THE Game_System SHALL add 1 point if patience >= 80%
8. WHEN calculating compatibility, THE Game_System SHALL add 1 point if stress tolerance >= 60%
9. WHEN calculating compatibility, THE Game_System SHALL add 2 points if communication >= 80%
10. THE Game_System SHALL allow married players to initiate divorce
11. WHEN divorce is initiated, THE Game_System SHALL finalize divorce in the following year
12. WHEN divorce is finalized, player SHALL keep all children
13. WHEN divorce is finalized, THE Game_System SHALL allow player to choose which vehicle to keep (player's or spouse's)
14. WHEN chosen vehicle doesn't fit family, THE Game_System SHALL require player to sell and purchase new vehicle
15. WHEN divorce is finalized, THE Game_System SHALL notify player to adjust childcare and prevent checkout until childcare meets needs
16. WHEN divorce is finalized, THE Game_System SHALL split money by calculating: (current money - player's original money - spouse's original money) / 2 + player's original money
17. WHEN divorce is finalized, THE Game_System SHALL split retirement savings using same formula as money split
18. WHEN divorce is finalized, THE Game_System SHALL split loans using same formula as money/savings split
19. WHEN divorce is finalized, THE Game_System SHALL apply +10% stress to player
20. THE Game_System SHALL track original money, savings, and loans for both player and spouse at time of marriage for divorce calculations


### Requirement 14C: Child Adoption System

**User Story:** As a player, I want to adopt children of different ages, so that I can build a family through adoption.

#### Acceptance Criteria

1. THE Game_System SHALL provide an "Apply to Adopt Child" action for players
2. THE Game_System SHALL allow only one adoption application per year
3. WHEN adoption application is submitted, THE Game_System SHALL disable the action until child is received
4. THE Game_System SHALL allow players to select one desired age group for adoption
5. THE Game_System SHALL only show age groups that player meets requirements for
6. WHEN adopting child age 0-2, THE Game_System SHALL require player stress <= 50%
7. WHEN adopting child age 0-2, THE Game_System SHALL require player age <= 42
8. WHEN adopting child age 0-2, THE Game_System SHALL randomly determine child availability within 5 years (current year + 4)
9. WHEN determining availability for age 0-2 adoption, THE Game_System SHALL use left-skewed distribution (1-5 years)
10. WHEN adopting child age 0-2, THE Game_System SHALL inform player that child is "typically available within 6 years"
11. WHEN child age 0-2 becomes available, THE Game_System SHALL notify player and offer option to proceed with adoption
12. WHEN player accepts age 0-2 adoption, THE Game_System SHALL verify player still meets requirements by end of current year
13. WHEN player accepts age 0-2 adoption, THE Game_System SHALL finalize adoption in following year and charge 2 time blocks
14. WHEN adopting child age 3-9, THE Game_System SHALL require player stress <= 60%
15. WHEN adopting child age 3-9, THE Game_System SHALL require player age <= 50
16. WHEN adopting child age 3-9, THE Game_System SHALL make child available within 1 year (current year)
17. WHEN adopting child age 3-9, THE Game_System SHALL charge 2 time blocks in current year
18. WHEN adopting child age 10-17, THE Game_System SHALL require player stress <= 60%
19. WHEN adopting child age 10-17, THE Game_System SHALL require player age <= 55
20. WHEN adopting child age 10-17, THE Game_System SHALL make child available within 1 year (current year)
21. WHEN adopting child age 10-17, THE Game_System SHALL charge 2 time blocks in current year
22. WHEN adoption is finalized, THE Game_System SHALL add child to player's family
23. WHEN adoption is finalized, THE Game_System SHALL mark child as adopted
24. THE Game_System SHALL apply same childcare, expenses, and time block requirements for adopted children as biological children


### Requirement 15: Retirement System

**User Story:** As a player, I want to save for retirement and eventually retire, so that I can plan for my later years.

#### Acceptance Criteria

1. THE Game_System SHALL provide a retirement savings account for each player
2. THE Game_System SHALL allow players to contribute any amount to retirement savings
3. THE Game_System SHALL apply 5% annual interest to retirement savings
4. WHEN a player is under 65 and withdraws from retirement, THE Game_System SHALL apply 10% tax penalty
5. WHEN a player reaches age 65, THE Game_System SHALL mark them as retired (but don't show player)
6. WHEN retired, THE Game_System SHALL allow penalty-free retirement withdrawals
7. THE Game_System SHALL allow retired players to continue working if desired
8. WHEN a spouse reaches age 65, THE Game_System SHALL automatically retire them
9. THE Game_System SHALL prevent forcing retired spouses to work

### Requirement 16: Aging and Death System

**User Story:** As a player, I want to experience aging and eventual death, so that the game has a natural conclusion.

#### Acceptance Criteria

1. WHEN a player is in their 40s, THE Game_System SHALL decrease health by 1% per year
2. WHEN a player is in their 50s, THE Game_System SHALL decrease health by 2% per year
3. WHEN a player is in their 60s, THE Game_System SHALL decrease health by 3% per year
4. WHEN a player is in their 70s, THE Game_System SHALL decrease health by 4% per year
5. WHEN a player is in their 80s, THE Game_System SHALL decrease health by 5% per year
6. WHEN a player's health reaches 5%, THE Game_System SHALL apply 20% death probability each year
7. WHEN a player dies, THE Game_System SHALL remove them from active players
8. WHEN a player dies, THE Game_System SHALL recalculate Lemonade_Pitcher goals
9. THE Game_System SHALL preserve deceased player's lemon contributions

### Requirement 17: Pet System

**User Story:** As a player, I want to adopt and care for pets, so that I can experience pet ownership.

#### Acceptance Criteria

1. THE Game_System SHALL allow players to adopt pets within housing limits
2. THE Game_System SHALL charge adoption fees based on pet size
3. THE Game_System SHALL charge annual pet expenses based on pet size
4. THE Game_System SHALL charge annual veterinary fees based on pet size
5. WHEN a player has veterinarian job, THE Game_System SHALL waive veterinary fees
6. THE Game_System SHALL track pet ages
7. WHEN pets reach death age range, THE Game_System SHALL roll for death with 50% probability
8. THE Game_System SHALL grant annual lemons for pet ownership
9. THE Game_System SHALL allow players to put pets up for adoption
10. THE Game_System SHALL enforce housing pet limits when selecting new housing


### Requirement 18: Expense Management

**User Story:** As a player, I want to review and pay my annual expenses, so that I can complete each year.

#### Acceptance Criteria

1. THE Game_System SHALL calculate all mandatory expenses at end of year
2. THE Game_System SHALL include housing costs in mandatory expenses
3. THE Game_System SHALL include transportation costs in mandatory expenses
4. THE Game_System SHALL include insurance costs in mandatory expenses
5. THE Game_System SHALL include childcare costs in mandatory expenses
6. THE Game_System SHALL include child expenses in mandatory expenses
7. THE Game_System SHALL include pet expenses in mandatory expenses
8. THE Game_System SHALL include grocery costs in mandatory expenses
9. THE Game_System SHALL include miscellaneous costs in mandatory expenses
10. THE Game_System SHALL include chronic health condition costs in mandatory expenses
11. THE Game_System SHALL include tuition costs in mandatory expenses
12. THE Game_System SHALL include tax preparation fees in mandatory expenses
13. THE Game_System SHALL calculate and include income taxes in mandatory expenses
14. THE Game_System SHALL allow players to allocate payments from regular money (including projected income) and retirement savings
15. WHEN a player cannot afford expenses, THE Game_System SHALL not let player pay end of year expenses until player has accounted for all expenses (ex: downgrading house/car, adjusting childcare, getting more loans)
16. THE Game_System SHALL display net health and stress changes for the year
17. WHEN expenses are paid, THE Game_System SHALL mark the year as complete

### Requirement 19: Good Deed System

**User Story:** As a player, I want to perform good deeds to earn bonus lemons and help other players, so that we can cooperate.

#### Acceptance Criteria

1. THE Game_System SHALL track each player's good deed count
2. THE Game_System SHALL track each player's bad deed count
3. THE Game_System SHALL calculate Good_Deed_Multiplier as 1 plus good deeds divided by 5 (floor)
4. THE Game_System SHALL calculate Bad_Deed_Multiplier as 1 plus bad deeds divided by 5 (floor)
5. WHEN a card offers a Good_Deed opportunity, THE Game_System SHALL notify all other players
6. WHEN a player accepts a Good_Deed opportunity, THE Game_System SHALL grant 2 lemons times Good_Deed_Multiplier
7. WHEN a player declines a Good_Deed opportunity, THE Game_System SHALL deduct 1 lemon times Bad_Deed_Multiplier
8. WHEN an action has Good_Deed lemon effect, THE Game_System SHALL apply Good_Deed_Multiplier to lemons earned
9. THE Game_System SHALL present 3 identical good deed options to all players each year
10. THE Game_System SHALL allow each player to select one annual good deed from the 3 options
11. WHEN a player completes annual good deed, THE Game_System SHALL grant 2 lemons times Good_Deed_Multiplier


### Requirement 20: Inflation System

**User Story:** As a player, I want costs and salaries to increase over time due to inflation, so that the game reflects economic reality.

#### Acceptance Criteria

1. THE Game_System SHALL apply 4-7% annual inflation to housing costs
2. THE Game_System SHALL apply 2-5% annual inflation to salaries
3. THE Game_System SHALL apply 2-5% annual inflation to auto insurance
4. THE Game_System SHALL apply 7-9% annual inflation to home insurance
5. THE Game_System SHALL apply 0.1-0.3% annual inflation to action costs
6. WHEN 5 years pass, THE Game_System SHALL increase tax bracket thresholds by $15,000
7. THE Game_System SHALL use random values within specified ranges for each inflation category

### Requirement 21: Notification System

**User Story:** As a player, I want to receive notifications about important events and deadlines, so that I can make informed decisions.

#### Acceptance Criteria

1. THE Game_System SHALL notify players when CPR certification expires
2. THE Game_System SHALL notify players when they may want to change childcare
3. THE Game_System SHALL notify players when spouse will retire
4. THE Game_System SHALL notify players when retirement savings become penalty-free
5. THE Game_System SHALL notify players when they graduate from educational programs
6. THE Game_System SHALL notify players when health is too low for job requirements
7. THE Game_System SHALL notify players when new year starts
8. THE Game_System SHALL notify players when you have a child event (adoption, birth, child reaches 18 years old)
9. THE Game_System SHALL notify players when requirement to change housing/transportation
10. THE Game_System SHALL notify players when job event (lost job)
11. THE Game_System SHALL notify players when pet dies
12. THE Game_System SHALL display notifications in navbar and on relevant pages
13. THE Game_System SHALL allow players to dismiss notifications

### Requirement 22: Filtering and Sorting System

**User Story:** As a player, I want to filter and sort actions, jobs, housing, and transportation, so that I can find options that fit my needs.

#### Acceptance Criteria

1. THE Game_System SHALL allow filtering actions by category
2. THE Game_System SHALL allow filtering actions by stress impact
3. THE Game_System SHALL allow filtering actions by health impact
4. THE Game_System SHALL allow filtering actions by cost
5. THE Game_System SHALL allow filtering actions by time blocks
6. THE Game_System SHALL allow filtering actions by skill/trait requirements
7. THE Game_System SHALL allow sorting actions by lemons per time block
8. THE Game_System SHALL allow sorting actions by lemons per dollar
9. THE Game_System SHALL allow sorting actions by cost per time block
10. THE Game_System SHALL allow filtering jobs by salary, PTO, stress, and requirements
11. THE Game_System SHALL allow filtering housing by location, capacity, and cost
12. THE Game_System SHALL allow filtering transportation by capacity, cost, and fuel type


### Requirement 23: Profile and Progress Tracking

**User Story:** As a player, I want to view my character's profile and track my progress, so that I can see how I'm developing.

#### Acceptance Criteria

1. THE Game_System SHALL display all player skills on a unified progress bar
2. THE Game_System SHALL display all player traits on a unified progress bar
3. THE Game_System SHALL display current health and stress levels
4. THE Game_System SHALL display current money and retirement savings
5. THE Game_System SHALL display current job, education, housing, and transportation
6. THE Game_System SHALL display family members including spouse and children
7. THE Game_System SHALL display owned pets
8. THE Game_System SHALL allow players to add notes via text, speech-to-text, or drawing
9. THE Game_System SHALL allow players to place items on a timeline
10. THE Game_System SHALL track action history showing frequency of each action performed

### Requirement 24: Scrapbook and End Game Summary

**User Story:** As a player, I want to review my life accomplishments when the game ends, so that I can reflect on my journey.

#### Acceptance Criteria

1. WHEN the game ends, THE Game_System SHALL display significant life events timeline
2. THE Game_System SHALL display all actions performed with frequency counts
3. THE Game_System SHALL display pie chart of activity categories
4. THE Game_System SHALL display total lemons earned over lifetime
5. THE Game_System SHALL display money graph over time
6. THE Game_System SHALL display starting and ending skills and traits
7. THE Game_System SHALL display inflation trends for different categories
8. THE Game_System SHALL display total grandchildren count
9. THE Game_System SHALL display all earned badges (ex: most good deeds, each action, etc)
10. THE Game_System SHALL track and display how many lemons each player contributed to the community pitcher throughout the game
11. THE Game_System SHALL track and display how many and which good deeds the player did
12. THE Game_System SHALL display savings over lifetime

### Requirement 25: Messaging System

**User Story:** As a player, I want to communicate with other players, so that we can coordinate and socialize.

#### Acceptance Criteria

1. THE Game_System SHALL provide a messaging interface accessible from all pages
2. THE Game_System SHALL allow players to send messages to other players in the same game
3. THE Game_System SHALL display message history
4. THE Game_System SHALL notify players of new messages

### Requirement 26: Career Progression Systems

**User Story:** As a player pursuing creative careers, I want to build my reputation and earn income through performances and publications, so that I can succeed as an artist, musician, or actor.

#### Acceptance Criteria

1. WHEN a player completes writing time blocks, THE Game_System SHALL track progress toward book completion
2. WHEN a book reaches 20 time blocks, THE Game_System SHALL allow publishing options
3. WHEN self-publishing, THE Game_System SHALL automatically publish the book
4. WHEN submitting to publisher, THE Game_System SHALL check writing and creativity thresholds
5. WHEN publisher requirements are met, THE Game_System SHALL publish the book
6. WHEN publisher requirements are not met, THE Game_System SHALL reject the book
7. THE Game_System SHALL calculate author income based on published books and skill levels
8. WHEN auditioning for acting roles, THE Game_System SHALL check bravery and perseverance requirements
9. WHEN audition is successful, THE Game_System SHALL grant role and calculate payment
10. WHEN audition fails, THE Game_System SHALL grant consolation skill increases
11. THE Game_System SHALL apply agent fee reduction of 15% when player has agent
12. WHEN performing music, THE Game_System SHALL calculate income based on performance type and skill level
13. THE Game_System SHALL track EPs and albums released for tour eligibility
14. THE Game_System SHALL require minimum releases for headline tour eligibility

### Requirement 27: Spouse Management

**User Story:** As a married player, I want my spouse to have their own career and contribute to household, so that marriage feels realistic.

#### Acceptance Criteria

1. THE Game_System SHALL allow spouse to have one job
2. THE Game_System SHALL allow spouse to attend school part-time while working part-time
3. THE Game_System SHALL track spouse's vehicle separately from player's vehicle
4. THE Game_System SHALL apply vehicle costs and cards to spouse's vehicle
5. THE Game_System SHALL track spouse's loans separately from player's loans
6. THE Game_System SHALL automatically pay spouse's minimum loan payments
7. THE Game_System SHALL allow player to make additional payments on spouse's loans
8. THE Game_System SHALL track joint loans acquired during marriage separately
9. WHEN spouse has CPR certification requirement, THE Game_System SHALL auto-renew certification
10. WHEN spouse reaches age 65, THE Game_System SHALL automatically retire spouse
11. THE Game_System SHALL prevent player from forcing retired spouse to work


### Requirement 28: Savings and Investment System

**User Story:** As a player, I want to save for my children's college education, so that I can help them succeed.

#### Acceptance Criteria

1. THE Game_System SHALL provide a college fund savings account
2. THE Game_System SHALL allow contributions to college fund at end of year
3. WHEN contributing to college fund, THE Game_System SHALL grant 1 lemon per 1% of current money contributed
4. WHEN youngest child reaches age 22, THE Game_System SHALL close college fund contributions

### Requirement 29: Insurance System

**User Story:** As a player, I want to purchase insurance to protect against financial losses, so that I can manage risk.

#### Acceptance Criteria

1. THE Game_System SHALL allow players to toggle health insurance on or off
2. WHEN player is under 26, THE Game_System SHALL allow staying on parent's insurance
3. WHEN on parent's insurance, THE Game_System SHALL waive health insurance costs
4. THE Game_System SHALL charge single health insurance at $6,000 per year plus $300 age increase
5. THE Game_System SHALL charge family health insurance at $12,000 per year plus $1,000 per child plus $450 age increase
6. WHEN all children are 18+ and player is divorced, THE Game_System SHALL allow switching to single plan
7. THE Game_System SHALL require all children under 18 to be on player's health insurance
8. THE Game_System SHALL allow players to toggle home insurance for owned homes
9. THE Game_System SHALL calculate auto insurance based on vehicle type, age, and driver factors
10. WHEN player has insurance, THE Game_System SHALL reduce costs for health problems, accidents, and disasters
11. WHEN player lacks insurance, THE Game_System SHALL charge full costs for health problems, accidents, and disasters

### Requirement 30: Grocery and Bulk Buying System

**User Story:** As a player, I want grocery costs to scale with family size and benefit from bulk buying, so that expenses feel realistic.

#### Acceptance Criteria

1. THE Game_System SHALL charge $3,000 per person per year for groceries
2. THE Game_System SHALL not count player's children that are over 18 years of age in grocery calculations
3. WHEN household has 3 or more people (not including children over 18), THE Game_System SHALL apply 20% bulk buying discount
4. WHEN bulk buying applies, THE Game_System SHALL charge $2,400 per person per year


### Requirement 31: Internship System

**User Story:** As a student, I want to complete internships to gain career-relevant skills, so that I can prepare for my future job.

#### Acceptance Criteria

1. THE Game_System SHALL allow internship actions only for enrolled students
2. THE Game_System SHALL limit internships to once per year
3. WHEN completing an internship, THE Game_System SHALL grant field-specific skills
4. WHEN a player has both internship and job, THE Game_System SHALL reduce summer job pay by 25%
5. WHEN a player has both internship and job, THE Game_System SHALL reduce summer job time blocks by 4
6. THE Game_System SHALL apply stress increase for internship completion

### Requirement 32: Childcare Calculation System

**User Story:** As a parent, I want childcare time blocks calculated based on my children's ages and my work schedule, so that I can manage my time.

#### Acceptance Criteria

1. THE Game_System SHALL calculate base childcare time blocks based on youngest child's age
2. WHEN child is age 0-2, THE Game_System SHALL assign 30 time blocks per year
3. WHEN child is age 3-5, THE Game_System SHALL assign 24 time blocks per year
4. WHEN child is age 6-9, THE Game_System SHALL assign 18 time blocks per year
5. WHEN child is age 10-12, THE Game_System SHALL assign 12 time blocks per year
6. WHEN child is age 13-17, THE Game_System SHALL assign 6 time blocks per year
7. THE Game_System SHALL add additional time blocks for multiple children based on age
8. WHEN both parents care for kids, THE Game_System SHALL reduce time blocks per section
9. WHEN only spouse cares for kids, THE Game_System SHALL reduce time blocks per section further
10. WHEN at least one parent is stay-at-home or both are part-time, THE Game_System SHALL waive childcare requirement
11. WHEN childcare is purchased, THE Game_System SHALL reduce time blocks based on childcare type
12. THE Game_System SHALL calculate childcare costs based on type and youngest child's age

### Requirement 33: Academic Action System

**User Story:** As a student, I want to perform academic actions to progress through my degree, so that I can graduate.

#### Acceptance Criteria

1. THE Game_System SHALL provide academic actions based on degree program
2. THE Game_System SHALL grant automatic skills and major skills for academic actions
3. THE Game_System SHALL apply stress based on academic action type
4. WHEN field is categorized as STEM, THE Game_System SHALL apply higher stress than humanities
5. THE Game_System SHALL require specific time block commitments for each academic action
6. THE Game_System SHALL track completion of general education, field, and major requirements
7. THE Game_System SHALL allow graduation when all requirements are met


### Requirement 34: Skill and Trait Progression System

**User Story:** As a player, I want my skills and traits to improve through actions, jobs, and education, so that I can develop my character.

#### Acceptance Criteria

1. THE Game_System SHALL track all skills as numbers from 0 to 100
2. THE Game_System SHALL track all traits as numbers from 0 to 100
3. WHEN an action grants skill increases, THE Game_System SHALL add the percentage to current skill
4. WHEN a job grants annual skill increases, THE Game_System SHALL apply them at year start
5. WHEN education grants skill increases, THE Game_System SHALL apply them based on academic actions
6. THE Game_System SHALL cap skills at 100
7. THE Game_System SHALL cap traits at 100
8. THE Game_System SHALL allow skills and traits to decrease from certain effects
9. THE Game_System SHALL display skill and trait changes in action results

### Requirement 35: PTO and Time Off System

**User Story:** As an employed player, I want to use PTO for vacations and mental health, so that I can take time off work.

#### Acceptance Criteria

1. THE Game_System SHALL grant PTO days based on job benefits
2. THE Game_System SHALL convert PTO days to time blocks (5 days = 1 time block)
3. THE Game_System SHALL allow players to request PTO through an action
4. WHEN PTO is requested, THE Game_System SHALL convert job time blocks to activity time blocks
5. THE Game_System SHALL require PTO for certain actions like domestic and international travel
6. WHEN a job has unpaid time off, THE Game_System SHALL not require PTO action
7. THE Game_System SHALL reset PTO when changing jobs
8. THE Game_System SHALL increase PTO based on years of service for some jobs

### Requirement 36: Comparison and Planning Tools

**User Story:** As a player, I want to compare housing and vehicle options side-by-side, so that I can make informed decisions.

#### Acceptance Criteria

1. THE Game_System SHALL provide a comparison feature for housing options
2. THE Game_System SHALL provide a comparison feature for vehicle options
3. THE Game_System SHALL display key attributes side-by-side in comparison view
4. THE Game_System SHALL allow players to select multiple options to compare
5. THE Game_System SHALL highlight differences between compared options

### Requirement 37: Tax Calculation System

**User Story:** As a player, I want taxes calculated accurately based on progressive tax brackets, so that I understand my tax burden.

#### Acceptance Criteria

1. THE Game_System SHALL calculate taxes using US progressive income tax system
2. THE Game_System SHALL apply tax brackets to taxable income
3. WHEN married, THE Game_System SHALL file taxes jointly
4. THE Game_System SHALL adjust tax brackets every 5 years by $15,000
5. THE Game_System SHALL ensure lowest bracket starts at $0
6. THE Game_System SHALL display tax calculation details to players
7. THE Game_System SHALL include link to tax bracket reference table
8. WHEN accessing retirement savings early, THE Game_System SHALL apply 10% additional tax penalty

### Requirement 38: Pension System

**User Story:** As a player in an eligible job, I want to earn pension benefits, so that I have retirement income.

#### Acceptance Criteria

1. THE Game_System SHALL mark eligible jobs with pension benefits
2. WHEN a player works in pension-eligible job, THE Game_System SHALL track years of service
3. WHEN a player retires from pension-eligible job, THE Game_System SHALL calculate pension payments
4. THE Game_System SHALL pay pension annually during retirement
5. THE Game_System SHALL display pension eligibility in job details

### Requirement 39: Debt Stress System

**User Story:** As a player with debt, I want debt to increase my stress, so that I feel pressure to pay it off.

#### Acceptance Criteria

1. THE Game_System SHALL calculate debt stress at beginning of year
2. THE Game_System SHALL add 1% stress per $20,000 in total debt
3. THE Game_System SHALL include all loan types in debt calculation
4. THE Game_System SHALL display debt stress separately in stress breakdown

### Requirement 40: Expense Forecasting System

**User Story:** As a player, I want to see if I can afford next year's expenses, so that I can plan accordingly.

#### Acceptance Criteria

1. THE Game_System SHALL calculate mandatory expenses for next year
2. THE Game_System SHALL add next year's salary to current money
3. THE Game_System SHALL subtract mandatory expenses from available funds
4. WHEN remaining funds <= $1,000, THE Game_System SHALL inform the player that their stress would increase 5%
5. WHEN remaining funds <= $5,000, THE Game_System SHALL inform the player that their stress would increase 3%
6. WHEN remaining funds <= $10,000, THE Game_System SHALL inform the player that their stress would increase 1%
7. THE Game_System SHALL display expense forecast to player


### Requirement 41: Cookie and Preference Storage

**User Story:** As a player, I want my UI preferences saved, so that my experience is consistent across sessions.

#### Acceptance Criteria

1. THE Game_System SHALL store profile section collapse/expand state in browser cookies
2. THE Game_System SHALL store filter preferences in browser cookies
3. THE Game_System SHALL restore preferences when player returns to game
4. THE Game_System SHALL maintain preferences for browser session duration
5. THE Game_System SHALL allow players to reset preferences

### Requirement 42: Home Improvement System

**User Story:** As a homeowner, I want to improve my property to increase its value, so that I can build equity.

#### Acceptance Criteria

1. THE Game_System SHALL allow remodeling for owned suburban homes
2. WHEN remodeling, THE Game_System SHALL allow player to choose investment amount
3. THE Game_System SHALL calculate home value increase between 50% and 80% of investment
4. THE Game_System SHALL allow pool installation for suburban homes
5. WHEN installing pool, THE Game_System SHALL calculate cost as percentage of original home value plus years owned
6. WHEN pool is installed, THE Game_System SHALL charge annual maintenance fee
7. WHEN pool is installed, THE Game_System SHALL increase home value
8. WHEN pool is installed, THE Game_System SHALL enable pool-related actions
9. THE Game_System SHALL allow solar panel installation for suburban homes
10. WHEN solar panels are installed, THE Game_System SHALL reduce utility costs by 60%
11. WHEN solar panels are installed, THE Game_System SHALL grant 2 lemons per year

### Requirement 43: Certification and License System

**User Story:** As a player, I want to earn and maintain certifications, so that I can qualify for certain jobs and actions.

#### Acceptance Criteria

1. THE Game_System SHALL track CPR certification status and expiration
2. WHEN CPR certification is obtained, THE Game_System SHALL mark it valid for 2 years
3. WHEN CPR certification expires, THE Game_System SHALL notify player
4. WHEN CPR certification expires, THE Game_System SHALL prevent actions requiring it
5. THE Game_System SHALL allow CPR certification renewal through action
6. THE Game_System SHALL grant certifications automatically for certain educational programs
7. THE Game_System SHALL track professional licenses obtained through jobs


### Requirement 44: Seasonal and Summer Job System

**User Story:** As a student or seasonal worker, I want to work summer or seasonal jobs, so that I can earn money during breaks.

#### Acceptance Criteria

1. THE Game_System SHALL allow seasonal jobs lasting 3 months
2. WHEN working seasonal job, THE Game_System SHALL use 4 time blocks
3. WHEN working seasonal job, THE Game_System SHALL pay 25% of annual salary
4. THE Game_System SHALL mark eligible jobs as seasonal
5. THE Game_System SHALL allow summer education jobs for students
6. THE Game_System SHALL allow part-time summer jobs while in school

### Requirement 45: Job Benefits and Perks System

**User Story:** As an employee, I want to receive job-specific benefits and perks, so that different careers feel unique.

#### Acceptance Criteria

1. WHEN player has fitness instructor job, THE Game_System SHALL waive gym membership costs
2. WHEN player has teacher or professor job, THE Game_System SHALL provide 4 time blocks unpaid time off
3. WHEN player has flight attendant or pilot job, THE Game_System SHALL provide 8 discounted travel tickets per year
4. WHEN player has veterinarian job, THE Game_System SHALL waive pet veterinary fees
5. WHEN player has mechanic job, THE Game_System SHALL provide 80% discount on auto maintenance
6. WHEN player has software developer job, THE Game_System SHALL provide 50% discount on tech problems
7. WHEN player has exterminator job, THE Game_System SHALL provide 70% discount on pest problems
8. WHEN player has plumber job, THE Game_System SHALL provide 85% discount on plumbing problems
9. WHEN player has electrician job, THE Game_System SHALL provide 80% discount on electrical problems
10. WHEN player has carpenter job, THE Game_System SHALL provide 40% discount on house repairs
11. WHEN player has cashier or store manager job, THE Game_System SHALL provide discount on yearly shopping
12. WHEN player has zoologist job, THE Game_System SHALL provide 4 free zoo tickets per year plus 50% discount
13. WHEN player has marine biologist job, THE Game_System SHALL provide 4 free aquarium tickets per year plus 50% discount

### Requirement 46: Multi-Job System

**User Story:** As a player, I want to work multiple part-time jobs simultaneously, so that I can maximize income.

#### Acceptance Criteria

1. THE Game_System SHALL allow players to have one full-time job
2. THE Game_System SHALL allow players to have multiple part-time jobs
3. THE Game_System SHALL allow players to have one full-time and one part-time job
4. THE Game_System SHALL sum time blocks from all jobs
5. THE Game_System SHALL sum stress from all jobs
6. THE Game_System SHALL sum income from all jobs
7. THE Game_System SHALL track each job separately for raises and termination
8. THE Game_System SHALL limit spouse to one job maximum

### Requirement 47: Location-Based Restrictions

**User Story:** As a player, I want job, housing, and service availability to depend on location, so that city and suburban living feel different.

#### Acceptance Criteria

1. THE Game_System SHALL mark jobs as city-only, suburb-only, or both
2. THE Game_System SHALL mark housing as city-only, suburb-only, or both
3. THE Game_System SHALL filter available options based on player's current location (but player can view all options)
4. WHEN changing location, THE Game_System SHALL require new housing selection
5. THE Game_System SHALL apply location-specific card effects only to eligible players
6. THE Game_System SHALL enforce bike restrictions preventing travel between city and suburbs

### Requirement 48: Wedding and Marriage Costs

**User Story:** As a player getting married, I want wedding costs to be influenced by parent contributions, so that family wealth matters.

#### Acceptance Criteria

1. WHEN getting married, THE Game_System SHALL calculate wedding cost
2. THE Game_System SHALL apply parent wedding contribution from initial die roll
3. THE Game_System SHALL charge player for remaining wedding costs
4. THE Game_System SHALL display parent contribution amount before marriage
5. THE Game_System SHALL allow player to decline marriage if cost is too high


### Requirement 49: Data Persistence and State Management

**User Story:** As a player, I want my game progress saved automatically, so that I can resume where I left off.

#### Acceptance Criteria

1. THE Game_System SHALL save player state after each action
2. THE Game_System SHALL save game session state after each year completion
3. THE Game_System SHALL persist all player attributes including skills, traits, health, and stress
4. THE Game_System SHALL persist all financial data including money, loans, and retirement savings
5. THE Game_System SHALL persist all relationships including spouse, children, and pets
6. THE Game_System SHALL persist all possessions including housing, vehicles, and certifications
7. THE Game_System SHALL persist Lemonade_Pitcher state including total lemons and goals
8. THE Game_System SHALL persist action history and good deed counts
9. WHEN a player reconnects, THE Game_System SHALL restore their complete game state
10. THE Game_System SHALL handle concurrent player actions without data conflicts

### Requirement 50: User Interface Navigation

**User Story:** As a player, I want intuitive navigation between game sections, so that I can easily access all features.

#### Acceptance Criteria

1. THE Game_System SHALL provide a navigation bar visible on all pages
2. THE Game_System SHALL display health, stress, and money in the navigation bar
3. THE Game_System SHALL display player name, game name, and game id in the navigation bar
4. THE Game_System SHALL provide quick access to profile through navigation drawer
5. THE Game_System SHALL display notification icon with count in navigation bar
6. THE Game_System SHALL provide access to Squeeze the Day (Actions), Harvest (Finances), Seeds to Trees (Jobs), Zest for Learning (Education), You Won't Get A 🍋 (Transportation), Home Sour Home (Housing), Lemonade Stand (Pitcher), and Life's Lemons (Scrapbook) pages
7. THE Game_System SHALL highlight current page in navigation
8. THE Game_System SHALL provide messaging system accessible from all pages
9. THE Game_System SHALL display mini Lemonade_Pitcher view in navigation bar with tooltip

### Requirement 51: Tutorial and Instructions

**User Story:** As a new player, I want access to game instructions and help, so that I can learn how to play.

#### Acceptance Criteria

1. THE Game_System SHALL provide a home page with game instructions
2. THE Game_System SHALL explain all game mechanics in instructions
3. THE Game_System SHALL provide tooltips for complex features
4. THE Game_System SHALL explain EARS patterns are not required in player-facing text
5. THE Game_System SHALL provide information buttons for calculations like taxes and insurance
6. THE Game_System SHALL explain time block system with visual examples
7. THE Game_System SHALL explain Lemonade_Pitcher goals and cooperative gameplay
8. THE Game_System SHALL provide glossary of game terms


### Requirement 52: Accessibility and Responsiveness

**User Story:** As a player on any device, I want the game to work well on my screen size, so that I can play comfortably.

#### Acceptance Criteria

1. THE Game_System SHALL render correctly on desktop browsers
2. THE Game_System SHALL render correctly on tablet devices
3. THE Game_System SHALL render correctly on mobile devices
4. THE Game_System SHALL use responsive layouts that adapt to screen size
5. THE Game_System SHALL ensure all interactive elements are touch-friendly
6. THE Game_System SHALL provide adequate contrast for readability
7. THE Game_System SHALL support keyboard navigation for all features
8. THE Game_System SHALL provide text alternatives for visual information

### Requirement 53: Performance and Scalability

**User Story:** As a player in a large game session, I want the game to remain responsive, so that gameplay is smooth.

#### Acceptance Criteria

1. THE Game_System SHALL support at least 10 concurrent players per game session
2. THE Game_System SHALL load player state within 2 seconds
3. THE Game_System SHALL process action execution within 1 second
4. THE Game_System SHALL update Lemonade_Pitcher display within 1 second of lemon contributions
5. THE Game_System SHALL handle year transitions for all players within 5 seconds
6. THE Game_System SHALL optimize database queries for fast data retrieval
7. THE Game_System SHALL cache frequently accessed game data

### Requirement 54: Error Handling and Validation

**User Story:** As a player, I want clear error messages when something goes wrong, so that I can correct my mistakes.

#### Acceptance Criteria

1. WHEN a player attempts an invalid action, THE Game_System SHALL display a clear error message
2. WHEN a player lacks requirements for an action, THE Game_System SHALL explain which requirements are missing
3. WHEN a player cannot afford an expense, THE Game_System SHALL not let player pay expense until player has accounted for that payment (ex: downgrading house/car, adjusting childcare, getting more loans)
4. WHEN a player exceeds time block limits, THE Game_System SHALL prevent checkout and explain the issue
5. WHEN a player violates housing occupancy limits, THE Game_System SHALL prevent selection and explain limits
6. WHEN network errors occur, THE Game_System SHALL display connection status and retry options
7. THE Game_System SHALL validate all user inputs before processing
8. THE Game_System SHALL prevent duplicate action execution
9. THE Game_System SHALL handle edge cases like division by zero gracefully


### Requirement 55: Random Number Generation and Probability

**User Story:** As a player, I want random events to feel fair and unpredictable, so that each playthrough is unique.

#### Acceptance Criteria

1. THE Game_System SHALL use cryptographically secure random number generation
2. THE Game_System SHALL apply specified probability distributions (bell curve, right-skewed, left-skewed, uniform)
3. WHEN rolling dice, THE Game_System SHALL ensure equal probability for each outcome
4. WHEN calculating success rates, THE Game_System SHALL use exact percentages specified in requirements
5. THE Game_System SHALL seed random generation to prevent predictability
6. THE Game_System SHALL log random outcomes for debugging purposes
7. THE Game_System SHALL ensure random events are independent unless specified otherwise

### Requirement 56: Animation and Visual Feedback

**User Story:** As a player, I want visual feedback for my actions, so that the game feels responsive and engaging.

#### Acceptance Criteria

1. WHEN lemons are earned, THE Game_System SHALL animate lemons being added to pitcher
2. WHEN health or stress changes, THE Game_System SHALL animate bar changes
3. WHEN skills increase, THE Game_System SHALL highlight the skill change
4. WHEN a new year starts, THE Game_System SHALL display birthday animation
5. WHEN cards are drawn, THE Game_System SHALL display card reveal animation
6. WHEN actions complete, THE Game_System SHALL display results with visual effects
7. THE Game_System SHALL provide loading indicators for long operations
8. THE Game_System SHALL use color coding for positive (green) and negative (red) changes

### Requirement 57: Sound and Audio

**User Story:** As a player, I want audio feedback for important events, so that I'm alerted even when not focused on the screen.

#### Acceptance Criteria

1. WHEN a new year starts, THE Game_System SHALL play birthday sound
2. WHEN lemons are earned, THE Game_System SHALL play positive sound effect
3. WHEN bad cards occur, THE Game_System SHALL play negative sound effect
4. WHEN notifications arrive, THE Game_System SHALL play notification sound
5. THE Game_System SHALL allow players to mute all sounds
6. THE Game_System SHALL allow players to adjust volume levels
7. THE Game_System SHALL respect browser audio permissions


### Requirement 58: Game Configuration and Settings

**User Story:** As a player, I want to customize game settings, so that I can tailor the experience to my preferences.

#### Acceptance Criteria

1. THE Game_System SHALL allow players to adjust audio volume
2. THE Game_System SHALL allow players to toggle sound effects on or off
3. THE Game_System SHALL allow players to toggle animations on or off
4. THE Game_System SHALL allow players to adjust text size
5. THE Game_System SHALL allow players to toggle tooltips on or off
6. THE Game_System SHALL persist settings across sessions
7. THE Game_System SHALL provide default settings for new players

### Requirement 60: Admin and Moderation Features

**User Story:** As a game host, I want to manage my game session, so that I can handle disruptive players.

#### Acceptance Criteria

1. THE Game_System SHALL designate game creator as host
2. THE Game_System SHALL allow any player to kick players from game (prompt for confirmation of action)
3. WHEN a player is kicked, THE Game_System SHALL recalculate Lemonade_Pitcher goals

### Requirement 61: Theme

**User Story:** As a game host, I want to be able to select a game theme to have more varied game experiences.

#### Acceptance Criteria

1. THE Game_System SHALL be easily configurable to have multiple game themes that could include different jobs, color schemes, etc (but don't actually create new themes yet).
2. THE Game_System SHALL allow the game host to select the game theme when creating the game.


