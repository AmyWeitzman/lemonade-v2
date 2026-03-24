# Product Overview

Lemonade is a multiplayer life-simulation board game ("When life gives you lemons…"). Players manage a character from age 18 through retirement/death, making decisions about education, careers, housing, family, and finances while collectively filling a community lemonade pitcher with lemons earned through actions.

## Current Status
- Active development — backend schema and seed data largely complete
- Prisma schema defined with all core models
- Seed data in progress: actions, cards, education programs, housing, vehicles, jobs
- Frontend scaffolded (React/Vite/MUI) but UI not yet built
- Game logic and API routes not yet implemented

## Core Game Concepts
- Players progress year-by-year, synchronously (all finish a year before the next begins)
- Each year: earn salary, choose actions (time-block based), pay expenses, manage stress/health
- Community pitcher: players collectively earn lemons; pitcher must stay above a rising goal line or the game ends
- Skills & traits affect job eligibility, education admission, and action outcomes
- Education chains: associates → bachelors → masters → doctorate (or professional certificates)
- Jobs have salary raise schedules, PTO, stress levels, and skill/health requirements
- Finances: loans (8% interest), taxes (progressive US brackets), inflation, retirement savings

## Key Design Documents
- `game-plan/Game_Instructions.md` - Full rules, coding notes, and UI specs
- `game-plan/Lemonade - *.csv` - Structured game data by domain
