# Implementation Tasks: Lemonade Multiplayer Game

## Phase 1: Foundation

- [x] 1. Project Setup and Infrastructure
  - Initialize monorepo with `/frontend` (React + TypeScript) and `/backend` (Node.js + TypeScript) directories
  - Configure TypeScript, ESLint, and Prettier for both projects
  - Set up Docker Compose with PostgreSQL, Redis, backend, and frontend services
  - Configure environment variables via `.env` files
  - _Requirements: Req 49, Req 53_

- [ ] 2. Database Schema and Migrations
  - Create Prisma schema for all core entities: User, GameSession, Player, Child, Pet, Loan, Employment, Education, HousingOwnership, VehicleOwnership, AdoptionApplication, Message, Notification, RetirementTransaction, ActionHistory, MarriageCompatibility, WritingProgress, ActingProgress, MusicProgress
  - Write and run initial migrations
  - Seed static game data tables: actions, jobs, education programs, housing catalog, vehicle catalog, cards
  - _Requirements: Req 1, Req 2, Req 49_

- [ ] 3. Authentication System
  - Implement `POST /api/auth/login` endpoint accepting `firstname.lastname` username format
  - Create or retrieve User record on login; generate JWT (7-day expiry)
  - Implement `authorize` middleware to validate JWT on protected routes
  - Implement `validatePlayerAlive` middleware for gameplay endpoints
  - Implement `GET /api/auth/me` and `POST /api/auth/refresh` endpoints
  - _Requirements: Req 8.1 (design section)_

- [ ] 4. Game Session Management API
  - Implement `POST /api/sessions` — create game with unique 6-character code, creator display name, theme, max players
  - Implement `GET /api/sessions` and `GET /api/sessions/:id`
  - Implement `POST /api/sessions/:id/join` — validate code, capacity, and waiting status; create Player record
  - Implement `POST /api/sessions/:id/leave` and `POST /api/sessions/:id/kick`
  - Implement `DELETE /api/sessions/:id` (host only)
  - _Requirements: Req 1_

- [ ] 5. WebSocket Server Setup
  - Configure Socket.IO server with JWT authentication on connection
  - Implement room management: join/leave game session rooms
  - Define and wire all server→client events: `playerJoined`, `playerLeft`, `yearStarted`, `lemonAdded`, `pitcherUpdated`, `cardDrawn`, `goodDeedOpportunity`, `notification`, `playerStateChanged`, `messageReceived`, `gameEnded`, `messageReactionUpdated`, `playerDied`
  - Handle disconnection and reconnection gracefully
  - _Requirements: Req 3, Req 25_


## Phase 2: Core Game Engine

- [ ] 6. Player Profile Initialization
  - Implement `POST /api/players/:id/initialize` — roll traits (bell curve), skills (bell/right-skewed), parent contributions (d10), starting money (savings + parent wealth + organization modifier), chronic conditions (20% chance)
  - Implement trait/skill adjustment UI flow: allow up to 50% total trait adjustment (max 10%/trait) and 10% total skill adjustment (max 2%/skill)
  - Display job and college requirements during adjustment so players can make informed choices
  - _Requirements: Req 2_

- [ ] 7. Year Cycle Engine
  - Implement `startNewYear(sessionId)` — increment age, apply aging health loss, reset stress, process job raises, apply job skill/trait gains, age children and pets, roll for grandchildren, apply inflation, update tax brackets every 5 years, reset year flags, send birthday notifications
  - Implement `POST /api/year/complete` — validate expenses paid, mark player year complete, trigger `startNewYear` when all players done
  - Implement `GET /api/year/status` — return completion status per player
  - Check adoption availability at start of each year (`checkAdoptionAvailability`)
  - _Requirements: Req 3_

- [ ] 8. Time Block Calculator
  - Implement `calculateTimeBlocks(player)` — allocate 60 blocks across sleep (20), work (sum of active jobs), childcare, commute, pets, activities (remainder)
  - Implement `calculateChildcareTimeBlocks(player)` — base blocks by youngest child age, additional blocks per extra child, reductions based on spouse/player work schedule and childcare purchases
  - Apply PTO adjustments (convert work blocks to activity blocks)
  - Expose time block state to frontend via player state
  - _Requirements: Req 4, Req 32_

- [ ] 9. Health and Stress Calculation Engines
  - Implement `calculateStress(player)` — aggregate job stress, education stress, debt stress (1% per $20k), children stress, pet stress, housing overcrowding stress, card stress, expense forecast stress; apply stress tolerance modifier
  - Implement `calculateHealth(player)` — apply stress-based health loss thresholds, aging health loss by decade, chronic condition max health cap
  - Implement `applyHealthEffects(player, temporaryChange, permanentChange)` — handle temporary vs permanent health changes, chronic condition 80% effectiveness rule
  - _Requirements: Req 5, Req 16, Req 39_

- [ ] 10. Financial Calculation Engine
  - Implement `calculateTaxes(player, session)` — progressive tax brackets, joint filing for married players, early retirement withdrawal penalty
  - Implement `calculateTaxPreparationFee(player)` — simple filing waiver, accounting experience waiver, complexity-based fee
  - Implement `applyLoanInterest(loans)` — 8% annual interest, 5% minimum payment
  - Implement `applyRetirementInterest(player, year)` — 5% annual interest, track in `retirementHistory`
  - Implement expense forecast: project next year's mandatory expenses vs available funds, calculate stress impact
  - _Requirements: Req 6, Req 37, Req 39, Req 40_

- [ ] 11. Random Event and Probability System
  - Implement `bellCurve(min, max)`, `rightSkewed(min, max)`, `leftSkewed(min, max)`, `rollDie(sides)` distribution helpers
  - Implement `drawCard(player)` — filter eligible cards, weighted frequency selection
  - Implement `attemptCardDraw(player)` — 20% chance per action, max 3 cards/year, broadcast `cardDrawn` event
  - Implement `rollForGrandchildren(player)` — formula: (1/5) × eligible kids (ages 25-40), roll 5-sided die
  - Implement pet death rolls — 50% chance per pet in death age range
  - _Requirements: Req 9, Req 55_

- [ ] 12. Inflation Engine
  - Implement `generateInflationRates()` — random rates within ranges: housing 4-7%, salary 2-5%, auto insurance 2-5%, home insurance 7-9%, other 0.1-0.3%
  - Implement `applyInflation(player, session)` — apply to housing rent/value, salaries, vehicle insurance, action costs
  - Update tax brackets every 5 years (+$15,000 per bracket threshold)
  - _Requirements: Req 20_


## Phase 3: Game Systems

- [ ] 13. Action System
  - Implement `GET /api/actions` with filters (category, stress impact, health impact, cost, time blocks, eligibility, location, favorites, good deed, senior discount, PTO required) and sort (lemons/TB, lemons/$, cost/TB, min cost)
  - Implement `GET /api/actions/search?q=term` — search by name/description
  - Implement eligibility checker — validate skills, traits, health, certifications, age, enrollment, location, other requirements
  - Implement `POST /api/actions/execute` — validate eligibility, time blocks, cost; apply effects (lemons, health, stress, skills, traits); trigger card draw attempt; broadcast `lemonAdded`
  - Implement `GET /api/actions/cart/validate` — validate total time blocks and cost against available
  - Track action frequency limits (once per year, multiple, unlimited) and action history
  - Apply senior discounts (age >= 65), job-specific discounts, per-person and per-time-block costs
  - _Requirements: Req 8, Req 22, Req 34_

- [ ] 14. Employment System
  - Implement `GET /api/jobs` with filters (salary, PTO, time blocks, stress, degree, skills/traits, location, perks) and sort
  - Implement `GET /api/jobs/search?q=term`
  - Implement `POST /api/jobs/:id/apply` — check education, skill, trait, health, certification requirements; assign job; adjust time blocks and projected income (half salary for mid-year switch)
  - Implement annual raise processing — check organization >= 25% and communication >= 25%; withhold raise if not met; fire after 2 consecutive years
  - Implement annual health requirement check — grace year then termination
  - Implement `POST /api/jobs/:id/quit`
  - Apply job benefits and perks (gym waiver, travel discount, vet fee waiver, mechanic discount, etc.)
  - Support full-time, part-time, and seasonal employment; multi-job tracking
  - _Requirements: Req 11, Req 44, Req 45, Req 46_

- [ ] 15. Education System
  - Implement `GET /api/education/programs` with filters and `GET /api/education/programs/search?q=term`
  - Implement `POST /api/education/enroll` — check skill/trait/prerequisite requirements; reject with hints if not met; set full-time or part-time
  - Implement annual academic progress — grant skill percentages per year (full-time: full %, part-time: half %); check graduation requirements (gen ed + field + major credits); award degree on completion
  - Implement `POST /api/education/scholarships` — check hidden criteria, award funds, roll over surplus
  - Implement `POST /api/education/change-major` and `POST /api/education/drop`
  - Handle CC→bachelors same-major shortcut (2 years, half gains)
  - Apply education stress (STEM multiplier)
  - _Requirements: Req 10, Req 33_

- [ ] 16. Housing System
  - Implement `GET /api/housing` with filters (location, capacity, pet limits, rent vs buy, max cost) and compare feature
  - Implement `POST /api/housing/:id/select` — validate occupancy limits, enforce age/enrollment restrictions, track `HousingOwnership` history, handle sale of current owned home (calculate market value with appreciation + improvements)
  - Implement `POST /api/housing/improvements` — remodel (50-80% value increase), pool (cost + annual maintenance + value increase + pool actions), solar panels (60% utility reduction + 2 lemons/year)
  - Implement `POST /api/housing/sell`
  - Apply annual housing costs: rent, utilities (base + per person), home insurance
  - Enforce pet limits when selecting new housing
  - _Requirements: Req 12, Req 42_

- [ ] 17. Transportation System
  - Implement `GET /api/vehicles` with filters (max cost, min people, car vs non-car, fuel type, age) and compare feature
  - Implement `POST /api/vehicles/:id/purchase` — validate family capacity, track `VehicleOwnership` history, deduct purchase price
  - Implement `POST /api/vehicles/:id/sell` — calculate depreciated value (15%/year, floor at 10% of original)
  - Apply annual costs: insurance (by vehicle type/age), gas, maintenance (by vehicle age: 0-2=$1100, 3-4=$1200, 5-7=$1300, 8-10=$1400, 11+=$1500); mechanic 80% discount
  - Enforce bike area restriction (no inter-area travel)
  - Track both player and spouse vehicles separately
  - _Requirements: Req 13_

- [ ] 18. Financial Management API
  - Implement `GET /api/finances/:playerId` — full financial summary
  - Implement `POST /api/finances/loan` — create loan, auto-loan if can't afford minimum payment
  - Implement `POST /api/finances/loan/payment` — pay down loans (own, spouse, joint separately)
  - Implement `POST /api/finances/retirement` and `POST /api/finances/retirement/withdraw` — track all transactions in `retirementHistory`; apply 10% early withdrawal penalty (under 65)
  - Implement `GET /api/finances/expenses` — calculate all mandatory expenses: housing, transportation, insurance, childcare, child expenses ($11k/child/yr), pet expenses, groceries (bulk discount at 3+ people), miscellaneous ($1200/person), chronic health conditions, tuition, tax prep fee, taxes
  - Implement `POST /api/finances/pay-expenses` — validate payment allocation from money + retirement; mark year complete
  - Implement `GET /api/finances/forecast` — project next year expenses vs funds
  - Implement college fund contributions (1 lemon per 1% of money contributed)
  - _Requirements: Req 6, Req 18, Req 28, Req 29, Req 30, Req 37, Req 38_

- [ ] 19. Relationship and Family System
  - Implement `POST /api/relationships/marry` — execute marriage: combine finances, add spouse loans, initialize compatibility tracking, charge wedding cost (minus parent contribution for first marriage)
  - Implement annual marriage compatibility calculation — score based on debt stress history, current stress, family actions, compassion, patience, stress tolerance, communication; grant 1%/year to communication/compassion/patience (max 20% total)
  - Implement `POST /api/relationships/divorce` — finalize next year: split assets using formula, keep all children, vehicle choice, +10% stress
  - Implement `POST /api/relationships/child` — try for child (age <= 45, probability-based success); +2% stress on failure
  - Implement `POST /api/relationships/adopt` — full adoption flow: eligibility check, application creation, availability timeline (0-2: left-skewed 1-5 years; 3-9 and 10-17: same year), notification, acceptance with re-verification
  - Implement grandchildren roll at year start (ages 25-40 children)
  - _Requirements: Req 14, Req 14A, Req 14B, Req 14C_

- [ ] 20. Dating App (Find Love Action)
  - Implement `executeFindLoveAction(player, preferences)` — validate communication >= 50 and compassion >= 50
  - Implement `generateCandidate(player, preferences, index)` — determine education by age (50/50 degree chance), select eligible job (exclude actor/author/ride-share/musician), calculate financial profile (money, retirement savings, debt via d5 multiplier), assign vehicle and housing, calculate initial compatibility score
  - Implement marriage execution from selected candidate — create Spouse record, combine finances, charge wedding cost, add spouse cart item
  - Charge 2 time blocks + 1 lemon if no candidate selected; 6 time blocks + 3 lemons if married
  - _Requirements: Req 14A_

- [ ] 21. Pet System
  - Implement `POST /api/pets/adopt` — validate housing pet limits, charge adoption fee by size
  - Implement `POST /api/pets/:id/release`
  - Apply annual pet expenses: food ($300 small/$500 large), vet fees ($75 small/$1000 large); waive vet fees for veterinarian job
  - Roll for pet death each year when in death age range (50% chance per pet)
  - Grant annual lemons for pet ownership
  - _Requirements: Req 17_

- [ ] 22. Card System Effects and Good Deed Flow
  - Implement card effect application — costs, temporary health, permanent health, stress, skills, traits, insurance rate changes
  - Implement good deed opportunity broadcast — notify all other players via `goodDeedOpportunity` WebSocket event
  - Implement `POST /api/cards/:id/respond` — accept (2 lemons × good deed multiplier, increment good deed count) or decline (−1 lemon × bad deed multiplier, increment bad deed count)
  - Implement annual good deed options — present 3 identical options to all players; each player selects one for 2 lemons × multiplier
  - _Requirements: Req 9, Req 19_

- [ ] 23. Lemonade Pitcher System
  - Implement pitcher capacity calculation — lemons per player by age bracket (20-22: 10, 23-30: 20, 31-50: 40, 51-65: 60, 66+: 80); recalculate on player death or departure
  - Implement `GET /api/pitcher/:sessionId` — current lemons, yearly goal, recommended per player
  - Implement grace year logic — one grace year if goal missed; end game if missed again
  - Broadcast `pitcherUpdated` on every lemon change
  - _Requirements: Req 7_

- [ ] 24. Aging, Death, and Retirement System
  - Implement aging health loss in year cycle (40s: -1%, 50s: -2%, 60s: -3%, 70s: -4%, 80s: -5%)
  - Implement `handlePlayerDeath(player)` — mark deceased, notify player and session, send system chat message, check if all players dead (end game)
  - Implement retirement: mark player retired at 65 (no forced retirement display), allow penalty-free withdrawals, auto-retire spouse at 65, prevent forcing retired spouse to work
  - Implement pension tracking and annual pension payments for eligible jobs
  - _Requirements: Req 15, Req 16, Req 38_

- [ ] 25. Insurance System
  - Implement health insurance toggle — single ($6k/yr + $300 age increase) vs family ($12k/yr + $1k/child + $450 age increase); parent insurance free until age 26; all children under 18 required on plan
  - Implement home insurance toggle for owned homes
  - Implement auto insurance calculation by vehicle type, age, and driver factors
  - Apply insurance reductions to card costs (health, auto, home)
  - _Requirements: Req 29_

- [ ] 26. Notification System
  - Implement `sendNotification(player, notification)` — save to DB, broadcast via WebSocket `notification` event
  - Implement `GET /api/notifications/:playerId` and `POST /api/notifications/:id/dismiss`
  - Trigger notifications for: CPR expiration, childcare changes needed, spouse retirement warning, retirement savings penalty-free, graduation, health too low for job, new year birthday, adoption available/complete, child turns 18, job loss, pet death, housing/transport change required
  - Display persistent notifications in navbar; show accordion on actions and expenses pages
  - _Requirements: Req 21_


## Phase 4: Multiplayer Coordination

- [ ] 27. Messaging System
  - Implement `POST /api/messages` — sanitize content (strip HTML, trim, max 500 chars), save, broadcast `messageReceived`
  - Implement `GET /api/messages/:sessionId` (paginated) and `GET /api/messages/:sessionId/recent` (last 50)
  - Implement `POST /api/messages/:messageId/react` — toggle emoji reaction (add/remove), validate against 10 supported emojis, broadcast `messageReactionUpdated`
  - Implement `sendSystemMessage(sessionId, content)` for automated events (player joined, year started, player died, etc.)
  - _Requirements: Req 25_

- [ ] 28. Career Progression Systems
  - Implement writing career — track time blocks toward book (20 TB = complete); self-publish or submit to publisher (check writing + creativity thresholds); calculate author income by published books and skill level
  - Implement acting career — audition rolls (bravery + perseverance); grant role and payment on success; consolation skill gains on failure; 15% agent fee reduction
  - Implement music career — track EPs and albums released; calculate performance income by type and skill; enforce minimum releases for headline tour eligibility
  - _Requirements: Req 26_

- [ ] 29. Spouse Management
  - Implement Spouse cart item — manage spouse job (one job max), school (PT + PT job allowed), vehicle
  - Track spouse vehicle separately; apply vehicle costs and cards to spouse vehicle
  - Auto-pay spouse minimum loan payments; allow additional payments on spouse/joint loans
  - Auto-renew spouse CPR certification if required (charge fee)
  - Auto-retire spouse at 65; prevent forcing retired spouse to work
  - _Requirements: Req 27_

- [ ] 30. Internship and PTO Systems
  - Implement internship action — enrolled students only, once per year, grant field skills, reduce summer job pay by 25% and time blocks by 4 if also employed
  - Implement PTO request action — convert job time blocks to activity time blocks (max half job's TBs); require PTO for travel actions; reset PTO on job change
  - Implement unpaid time off for eligible jobs (teacher, professor: 4 TBs; flight attendant/pilot: 8 discounted travel tickets)
  - _Requirements: Req 31, Req 35_

- [ ] 31. Certification and License System
  - Track CPR certification status and 2-year expiration
  - Notify player on expiration; block actions requiring CPR
  - Auto-grant certifications from educational programs
  - Track professional licenses from jobs
  - _Requirements: Req 43_

- [ ] 32. Location-Based Restrictions
  - Mark jobs, housing, and actions as city-only, suburb-only, or both
  - Filter available options by player's current location (but allow viewing all)
  - Require new housing selection when changing location
  - Apply location-specific card eligibility
  - Enforce bike restriction (no inter-area travel)
  - _Requirements: Req 47_

## Phase 5: Frontend — Core UI

- [ ] 33. App Shell and Navigation
  - Build responsive app shell with primary navigation bar (health bar, stress bar, money display, mini pitcher, notification badge, message badge, player name)
  - Implement themed page routes: Lemonade (home), Squeeze the Day (actions), Harvest (finances), Seeds to Trees (jobs), Zest for Learning (education), You Won't Get A 🍋 (transportation), Home Sour Home (housing), Lemonade Stand (pitcher), Life's Lemons (scrapbook)
  - Implement secondary navigation drawer: Tending the Garden (profile), Lemon Tea (chat), Planting & Pruning (notifications), Nutrients (settings)
  - Responsive breakpoints: mobile (<768px bottom tabs), tablet (768-1024px side drawer), desktop (>1024px full sidebar)
  - Store collapse/expand preferences and filter preferences in browser cookies
  - _Requirements: Req 50, Req 41_

- [ ] 34. Home Page and Game Lobby
  - Build landing page with username entry (firstname.lastname format validation)
  - Build game lobby showing active and completed game history
  - Build "Create New Game" flow — display name, theme, max players; show generated 6-character code with copy button; waiting room with player list; enable "Start Game" at 2+ players
  - Build "Join Game" flow — enter code, enter display name, join waiting room
  - Include game instructions/tutorial section
  - _Requirements: Req 1, Req 51_

- [ ] 35. Player Profile Initialization UI
  - Build trait and skill assignment screen — show randomly assigned values with bell/skewed curve visualization
  - Show adjustment interface — remaining adjustment budget (50% traits, 10% skills), per-trait/skill sliders (max 10%/2%), highlight jobs and college programs player qualifies for
  - Show parent contribution results (die roll outcome)
  - _Requirements: Req 2_

- [ ] 36. Profile Drawer (Tending the Garden)
  - Build collapsible profile drawer with sections: skills progress bar (all skills plotted), traits progress bar (all traits plotted), health/stress bars with max health indicator (grayed out above max with tooltip), finances summary, family (spouse, children, pets), certifications, timeline
  - Notes feature: text input, speech-to-text, drawing canvas, timeline placement
  - Show chronic condition health cap explanation in tooltip
  - _Requirements: Req 23_

- [ ] 37. Actions Page (Squeeze the Day)
  - Build action catalog with search bar, filter panel (category, cost, time blocks, health/stress impact, eligibility toggle, location, favorites, good deed, senior discount, PTO required, etc.), and sort dropdown
  - Build time block visualizer — 60-block scale showing sleep/work/childcare/commute/pets/activities allocation
  - Build action card component — name, description, requirements (with eligibility indicators), cost, time blocks, effects (lemons, health, stress, skills)
  - Build cart system — floating cart button with count, cart drawer with real-time validation (time blocks, cost), checkout button
  - Show express checkout actions with immediate execution modal
  - Display results modal after checkout — lemons earned (animated), health/stress changes (color-coded), skill/trait gains
  - Re-filter actions in real-time on cart changes
  - _Requirements: Req 8, Req 22_

- [ ] 38. Jobs Page (Seeds to Trees)
  - Build job catalog with search, filters (salary, PTO, time blocks, stress, degree, skills/traits, location, perks, raise type), and sort
  - Build job card — title, requirements, salary, raise schedule, time blocks, stress, PTO, benefits, skill/trait gains
  - Implement apply flow — show requirement check results; on success assign job and update time blocks/projected income
  - Show current employment status and history
  - _Requirements: Req 11_

- [ ] 39. Education Page (Zest for Learning)
  - Build program catalog with search, filters, and sort
  - Build program card — name, type, field, requirements, tuition, skill gains, stress level
  - Implement enrollment flow — full-time vs part-time selection, requirement check with hints on rejection
  - Show academic progress — credits completed (gen ed, field, major), graduation requirements, estimated graduation year
  - Implement scholarship application action
  - Show change major and drop out options
  - _Requirements: Req 10_

- [ ] 40. Housing Page (Home Sour Home)
  - Build housing catalog sorted by cost (low→high) with filters (location, recommended/legal max occupancy, pet limits, rent vs buy, max cost) and compare feature (side-by-side)
  - Build housing card — name, type, location, costs (rent/purchase, utilities, insurance), occupancy limits, pet limit, improvement options
  - Implement selection flow — occupancy validation, stress notification on change
  - Implement home improvements UI — remodel (investment amount input), pool (cost calculation), solar panels
  - Show current home value for owned homes
  - _Requirements: Req 12, Req 42_

- [ ] 41. Transportation Page (You Won't Get A 🍋)
  - Build vehicle catalog sorted by cost with filters (max cost, min people, car vs non-car, fuel type, age) and compare feature
  - Build vehicle card — name, type, fuel, purchase price, annual costs (insurance, gas, maintenance), capacity
  - Implement purchase/sell flow — family capacity validation, depreciation calculation on sale
  - Show both player and spouse vehicles with individual cost breakdowns
  - _Requirements: Req 13_

- [ ] 42. Finances Page (Harvest)
  - Build financial summary — current money, projected income, retirement savings, loans (own/spouse/joint), college fund
  - Build annual expenses breakdown — all mandatory expense line items with totals
  - Build loan management — take out loan, make payments (own/spouse/joint separately), show interest accrual
  - Build retirement management — contribute, withdraw (show penalty warning if under 65), history chart
  - Build expense payment flow — allocate from money and/or retirement savings; block checkout if can't cover all expenses
  - Show tax calculation with bracket info and tax prep fee
  - Show net health and stress changes for the year
  - _Requirements: Req 6, Req 18, Req 37_

- [ ] 43. Lemonade Pitcher Page (Lemonade Stand)
  - Build pitcher visualization — animated pitcher filling with lemons, current count, yearly goal line, recommended per-player contribution
  - Show contributions breakdown by player
  - Show grace year status if applicable
  - Display mini pitcher in navbar with tooltip
  - _Requirements: Req 7_

- [ ] 44. Messaging Interface (Lemon Tea)
  - Build chat panel accessible from all pages
  - Show message history (paginated, scrollable) with player names color-coded
  - System messages styled in gray italic
  - Emoji reaction picker (10 supported emojis) — click to toggle, show counts and reactor names on hover
  - Real-time message delivery via WebSocket
  - Character counter (500 max)
  - Show "(Deceased)" tag next to deceased player names
  - _Requirements: Req 25_

## Phase 6: Frontend — Advanced Features

- [ ] 45. End-of-Year Expenses Flow
  - Build end-of-year expenses page — show all mandatory expenses, allow payment allocation (money vs retirement), validate can cover all costs
  - Show childcare adjustment prompt if family situation changed
  - Show loan payment options (minimum auto-paid, optional additional)
  - Block year completion until all expenses accounted for
  - _Requirements: Req 18_

- [ ] 46. Card Draw and Good Deed UI
  - Build card reveal modal — animated reveal, card name, description, effects (cost, health, stress)
  - Build good deed opportunity notification — popup for other players with accept/decline options and lemon reward preview
  - Build annual good deed selection — show 3 options, allow one selection per year
  - _Requirements: Req 9, Req 19_

- [ ] 47. Comparison Tools
  - Build side-by-side comparison modal for housing (up to 3+ items on desktop, 1 at a time on mobile)
  - Build side-by-side comparison modal for vehicles
  - Highlight differences between compared options
  - _Requirements: Req 36_

- [ ] 48. Deceased Player Experience
  - Show "Game Over" modal on death with explanation of remaining access
  - Redirect to scrapbook; show persistent "Deceased" banner
  - Disable all gameplay pages with lock icon and tooltip
  - Keep chat and scrapbook fully accessible
  - Show "💀" badge on deceased player names in chat and pitcher
  - _Requirements: Req 16_

- [ ] 49. Scrapbook / End Game Summary (Life's Lemons)
  - Build life events timeline — significant events at each age
  - Show action history — frequency counts, pie chart of activity categories
  - Show money graph over time
  - Show starting vs ending skills and traits
  - Show inflation trends by category
  - Show total lemons earned, good deeds performed, grandchildren count
  - Show retirement savings summary (contributions, interest, withdrawals, penalties)
  - Show housing and vehicle history summaries
  - Display earned badges (Lemon Grove)
  - _Requirements: Req 24_

- [ ] 50. Settings and Preferences (Nutrients)
  - Build audio settings — toggle sound effects, adjust volume
  - Build display settings — theme preferences
  - Build preference reset option
  - Persist all settings in browser cookies for session duration
  - _Requirements: Req 41, Req 57, Req 58_

## Phase 7: Polish and Testing

- [ ] 51. Animations and Visual Feedback
  - Lemon contribution animations (lemons flying into pitcher)
  - Color-coded health/stress bars with smooth transitions
  - Skill/trait gain highlights in results modal
  - Confetti for major achievements (graduation, marriage, retirement)
  - Progress bar animations for skills and traits
  - _Requirements: Req 56_

- [ ] 52. Sound Effects
  - Birthday notification sound
  - Lemon contribution sound
  - Card draw sound
  - Good deed opportunity alert
  - Year completion sound
  - _Requirements: Req 57_

- [ ] 53. Unit Tests
  - Test all game engine calculations: health, stress, time blocks, taxes, loan interest, inflation, good deed multipliers, childcare time blocks
  - Test probability distributions (bell curve, right-skewed, left-skewed)
  - Test eligibility checkers (actions, jobs, education, adoption)
  - Test financial calculations (divorce settlement, retirement interest, expense forecast)
  - _Requirements: Req 55_

- [ ] 54. Integration Tests
  - Test all REST API endpoints (CRUD, validation, authorization)
  - Test WebSocket events (connection, room management, broadcasting)
  - Test year cycle processing end-to-end
  - Test multiplayer coordination (multiple players completing year)
  - _Requirements: Req 49, Req 53_

- [ ] 55. End-to-End Tests
  - Test complete game flow: create game → initialize player → play year → pay expenses → next year
  - Test good deed opportunity flow across multiple players
  - Test game ending scenarios (pitcher failure, all deceased)
  - Test deceased player access restrictions
  - _Requirements: Req 53_

- [ ] 56. Performance and Accessibility
  - Load test with 10+ concurrent players per session
  - Verify API response times: player state < 2s, actions < 1s, pitcher updates < 1s, year transitions < 5s
  - Ensure touch targets >= 44px on mobile
  - Add ARIA labels and keyboard navigation to all interactive elements
  - _Requirements: Req 52, Req 53_

## Phase 8: Deployment

- [ ] 57. Production Infrastructure
  - Configure production Docker images for frontend and backend
  - Set up managed PostgreSQL with connection pooling (PgBouncer)
  - Set up Redis cluster for session management and Socket.IO adapter
  - Configure Nginx load balancer with sticky sessions for WebSocket
  - Set up CDN for static frontend assets

- [ ] 58. CI/CD Pipeline
  - Configure pipeline: lint → type check → unit tests → build → integration tests → push images → deploy staging → E2E tests → deploy production (manual approval)
  - Set up environment-specific `.env` configurations

- [ ] 59. Monitoring and Logging
  - Configure structured logging (ERROR, WARN, INFO, DEBUG levels)
  - Set up APM for API response time and error tracking
  - Monitor WebSocket connection counts and memory usage
  - Set up database query monitoring and alerting
