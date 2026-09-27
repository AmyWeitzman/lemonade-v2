import { PrismaClient } from '@prisma/client';

export async function seedCards(prisma: PrismaClient) {
  // Shared good deed ride options — location-aware
  const rideOptions = [
    { description: 'Give them a ride', location: 'same_home_and_work', cost: 0, lemonsReward: 2, timeBlocks: 0 },
    { description: 'Give them a ride', location: 'same_home_or_work',  cost: 0, lemonsReward: 3, timeBlocks: 0 },
    { description: 'Give them a ride', location: 'different_location', cost: 0, lemonsReward: 4, timeBlocks: 2 },
  ];

  const cards = [
    // ── Good Cards ──────────────────────────────────────────────────────────
    { name: 'Found a Four-Leaf Clover',                  type: 'good', frequency: 1, requirements: {}, effects: { lemons: 1 }, isGoodDeedOpportunity: false, goodDeedOptions: [] },
    { name: 'Win the Lottery',                           type: 'good', frequency: 1, requirements: {}, effects: { money: 1000000 }, isGoodDeedOpportunity: false, goodDeedOptions: [] },
    { name: 'Found Money',                               type: 'good', frequency: 1, requirements: { location: 'city' }, effects: { money: 100 }, isGoodDeedOpportunity: false, goodDeedOptions: [] },
    { name: 'Old Friend Reaches Out',                    type: 'good', frequency: 2, requirements: {}, effects: { lemonsIfUnder40: 1, lemonsIfOver40: 2 }, isGoodDeedOpportunity: false, goodDeedOptions: [] },
    { name: 'Friends Threw You a Surprise Birthday Party', type: 'good', frequency: 3, requirements: {}, effects: { lemons: 1 }, isGoodDeedOpportunity: false, goodDeedOptions: [] },
    { name: 'Read a Good Book',                          type: 'good', frequency: 3, requirements: {}, effects: { lemons: 1 }, isGoodDeedOpportunity: false, goodDeedOptions: [] },
    { name: 'Someone Held the Door Open for You',        type: 'good', frequency: 2, requirements: {}, effects: { lemons: 1 }, isGoodDeedOpportunity: false, goodDeedOptions: [] },
    { name: 'Receive a Nice Gift',                       type: 'good', frequency: 2, requirements: {}, effects: { lemons: 1 }, isGoodDeedOpportunity: false, goodDeedOptions: [] },
    { name: 'Your Favorite Snacks Were on Sale',         type: 'good', frequency: 3, requirements: {}, effects: { groceryDiscount: 20 }, isGoodDeedOpportunity: false, goodDeedOptions: [] },
    { name: 'Make a New Friend',                         type: 'good', frequency: 2, requirements: {}, effects: { lemons: 1 }, isGoodDeedOpportunity: false, goodDeedOptions: [] },
    { name: 'Find a New Recipe You Like',                type: 'good', frequency: 3, requirements: {}, effects: { lemons: 1 }, isGoodDeedOpportunity: false, goodDeedOptions: [] },
    { name: 'Hear a Funny Joke',                         type: 'good', frequency: 4, requirements: {}, effects: { stress: -1 }, isGoodDeedOpportunity: false, goodDeedOptions: [] },
    { name: 'Received a Compliment',                     type: 'good', frequency: 3, requirements: {}, effects: { lemons: 1 }, isGoodDeedOpportunity: false, goodDeedOptions: [] },
    { name: 'No Line at Store Checkout',                 type: 'good', frequency: 2, requirements: {}, effects: { lemons: 1 }, isGoodDeedOpportunity: false, goodDeedOptions: [] },

    // ── Bad Cards — Mugging ──────────────────────────────────────────────────
    { name: 'Mugged', type: 'bad', frequency: 2, requirements: { location: 'city', notPublicTransit: true, caution: { min: 30, max: 60 } }, effects: { money: -20,  caution: 2, stress: 5 }, isGoodDeedOpportunity: false, goodDeedOptions: [] },
    { name: 'Mugged', type: 'bad', frequency: 3, requirements: { location: 'city', notPublicTransit: true, caution: { max: 30 } },           effects: { money: -100, caution: 2, stress: 5 }, isGoodDeedOpportunity: false, goodDeedOptions: [] },
    { name: 'Mugged', type: 'bad', frequency: 3, requirements: { vehicle: 'public_transit', caution: { min: 30, max: 60 } },                  effects: { money: -20,  caution: 2, stress: 5 }, isGoodDeedOpportunity: false, goodDeedOptions: [] },
    { name: 'Mugged', type: 'bad', frequency: 4, requirements: { vehicle: 'public_transit', caution: { max: 30 } },                           effects: { money: -20,  caution: 2, stress: 5 }, isGoodDeedOpportunity: false, goodDeedOptions: [] },

    // ── Bad Cards — Health ───────────────────────────────────────────────────
    { name: 'Minor Health Problem',    type: 'bad', frequency: 2, requirements: {},                          effects: { healthTemp: -2, stress: 2,  costWithInsurance: 25,    costWithoutInsurance: 100    }, isGoodDeedOpportunity: false, goodDeedOptions: [] },
    { name: 'Major Health Problem',    type: 'bad', frequency: 1, requirements: { health: { min: 40 } },     effects: { healthTemp: -3, healthPerm: -2, stress: 10, timeBlocks: -2, costWithInsurance: 3200,  costWithoutInsurance: 40000  }, isGoodDeedOpportunity: true,  goodDeedOptions: [{ description: 'Support by spending $1000', cost: 1000, lemonsReward: 2, timeBlocks: 0 }, { description: 'Support by using 2 time blocks', cost: 0, lemonsReward: 2, timeBlocks: 2 }] },
    { name: 'Major Health Problem',    type: 'bad', frequency: 3, requirements: { health: { max: 40 } },     effects: { healthTemp: -4, healthPerm: -6, stress: 20, timeBlocks: -4, costWithInsurance: 20000, costWithoutInsurance: 180000 }, isGoodDeedOpportunity: true,  goodDeedOptions: [{ description: 'Support by spending $1000', cost: 1000, lemonsReward: 2, timeBlocks: 0 }, { description: 'Support by using 2 time blocks', cost: 0, lemonsReward: 2, timeBlocks: 2 }] },
    { name: 'Chronic Health Condition',type: 'bad', frequency: 2, requirements: {},                          effects: { health: -15, stressPerYr: 5, costWithInsurancePerYr: 3000, costWithoutInsurancePerYr: 5000, timeBlocks: -2 }, isGoodDeedOpportunity: false, goodDeedOptions: [] },
    { name: 'Child Minor Health Problem', type: 'bad', frequency: 2, requirements: { hasChildUnder26: true }, effects: { stress: 1, costWithInsurance: 25, costWithoutInsurance: 100 }, isGoodDeedOpportunity: false, goodDeedOptions: [] },
    { name: 'Child Major Health Problem', type: 'bad', frequency: 1, requirements: { hasChildUnder26: true }, effects: { stress: 5, timeBlocks: -2, costWithInsurance: 3200, costWithoutInsurance: 40000 }, isGoodDeedOpportunity: true, goodDeedOptions: [{ description: 'Support by spending $500', cost: 500, lemonsReward: 2, timeBlocks: 0 }, { description: 'Care for the person', cost: 0, lemonsReward: 2, timeBlocks: 0, minCompassion: 80 }] },

    // ── Bad Cards — Food ─────────────────────────────────────────────────────
    { name: 'Food Poisoning', type: 'bad', frequency: 2, requirements: {}, effects: { stress: 2 }, isGoodDeedOpportunity: true, goodDeedOptions: [{ description: 'Make chicken soup', cost: 10, lemonsReward: 2, timeBlocks: 0 }, { description: 'Care for the person', cost: 0, lemonsReward: 2, timeBlocks: 0, minCompassion: 80 }] },

    // ── Bad Cards — Vehicle: Locked Keys ────────────────────────────────────
    { name: 'Locked Keys in Car', type: 'bad', frequency: 1, requirements: { hasCar: true, caution: { min: 50 } }, effects: { caution: 1, stress: 2 }, isGoodDeedOpportunity: false, goodDeedOptions: [] },
    { name: 'Locked Keys in Car', type: 'bad', frequency: 3, requirements: { hasCar: true, caution: { max: 50 } }, effects: { caution: 1, stress: 2 }, isGoodDeedOpportunity: false, goodDeedOptions: [] },

    // ── Bad Cards — Vehicle Stolen ───────────────────────────────────────────
    // freq 1: caution >= 30 — location-aware ride options
    { name: 'Vehicle Stolen', type: 'bad', frequency: 1,
      requirements: { notPublicTransit: true, caution: { min: 30 } },
      effects: { stress: 5, receiveInsuranceValue: true },
      isGoodDeedOpportunity: true, goodDeedOptions: rideOptions },

    // freq 3: caution < 30
    { name: 'Vehicle Stolen', type: 'bad', frequency: 3,
      requirements: { notPublicTransit: true, caution: { max: 30 } },
      effects: { stress: 5, receiveInsuranceValue: true },
      isGoodDeedOpportunity: true, goodDeedOptions: rideOptions },

    // ── Bad Cards — Public Transit ───────────────────────────────────────────
    { name: 'Public Transit Was Late', type: 'bad', frequency: 3, requirements: { vehicle: 'public_transit' }, effects: { stress: 1 }, isGoodDeedOpportunity: false, goodDeedOptions: [] },

    // ── Bad Cards — Bike Repairs ─────────────────────────────────────────────
    // Fix #2: laborIfHomeRepairBelow threshold is 10 (from CSV: "if home repair < 10")
    { name: 'Bike Repairs', type: 'bad', frequency: 2,
      requirements: { vehicle: 'bike', owner: 'player' },
      effects: { laborIfHomeRepairBelow: 10, laborCost: 50, parts: 50 },
      isGoodDeedOpportunity: false, goodDeedOptions: [] },

    { name: 'Bike Repairs', type: 'bad', frequency: 2,
      requirements: { vehicle: 'bike', owner: 'spouse' },
      effects: { laborIfHomeRepairBelow: 10, laborCost: 50, parts: 50 },
      isGoodDeedOpportunity: false, goodDeedOptions: [] },

    // ── Bad Cards — Bike Accident ────────────────────────────────────────────
    // Fix #3: insurance effects added; bike totaled → receive $500 from other person's insurance
    { name: 'Bike Accident', type: 'bad', frequency: 4,
      requirements: { vehicle: 'bike', owner: 'player', caution: { max: 30 } },
      effects: {
        healthTemp: -1, healthPerm: -2, stress: 10,
        insurance: {
          vehicleReplacementFromOtherParty: 500,
          medicalCoveredByOtherParty: true,
        },
      },
      isGoodDeedOpportunity: false, goodDeedOptions: [] },

    { name: 'Bike Accident', type: 'bad', frequency: 4,
      requirements: { vehicle: 'bike', owner: 'spouse', caution: { min: 0 } },
      effects: {
        healthTemp: 0, healthPerm: 0, stress: 0,
        insurance: {
          vehicleReplacementFromOtherParty: 500,
          medicalCoveredByOtherParty: true,
        },
      },
      isGoodDeedOpportunity: false, goodDeedOptions: [] },

    { name: 'Bike Accident', type: 'bad', frequency: 2,
      requirements: { vehicle: 'bike', owner: 'player', caution: { min: 30, max: 60 } },
      effects: {
        healthTemp: -1, healthPerm: -1, stress: 10,
        insurance: {
          vehicleReplacementFromOtherParty: 500,
          medicalCoveredByOtherParty: true,
        },
      },
      isGoodDeedOpportunity: false, goodDeedOptions: [] },

    { name: 'Bike Accident', type: 'bad', frequency: 1,
      requirements: { vehicle: 'bike', owner: 'player', caution: { min: 60 } },
      effects: {
        healthTemp: -1, stress: 10,
        insurance: {
          vehicleReplacementFromOtherParty: 500,
          medicalCoveredByOtherParty: true,
        },
      },
      isGoodDeedOpportunity: false, goodDeedOptions: [] },

    // ── Bad Cards — Minor Car Repairs ────────────────────────────────────────
    // Fix #2: laborIfHomeRepairBelow threshold is 20 (from CSV: "if home repair < 20")
    { name: 'Minor Car Repairs', type: 'bad', frequency: 1, requirements: { hasCar: true, owner: 'player', carAge: { max: 4 } },        effects: { laborIfHomeRepairBelow: 20, laborCost: 100, parts: 300, stress: 5 }, isGoodDeedOpportunity: false, goodDeedOptions: [] },
    { name: 'Minor Car Repairs', type: 'bad', frequency: 3, requirements: { hasCar: true, owner: 'player', carAge: { min: 5, max: 10 } }, effects: { laborIfHomeRepairBelow: 20, laborCost: 100, parts: 300, stress: 5 }, isGoodDeedOpportunity: false, goodDeedOptions: [] },
    { name: 'Minor Car Repairs', type: 'bad', frequency: 5, requirements: { hasCar: true, owner: 'player', carAge: { min: 11 } },         effects: { laborIfHomeRepairBelow: 20, laborCost: 100, parts: 300, stress: 5 }, isGoodDeedOpportunity: false, goodDeedOptions: [] },

    { name: 'Minor Car Repairs', type: 'bad', frequency: 1, requirements: { hasCar: true, owner: 'spouse', carAge: { max: 4 } },        effects: { laborIfHomeRepairBelow: 20, laborCost: 100, parts: 300, stress: 0 }, isGoodDeedOpportunity: false, goodDeedOptions: [] },
    { name: 'Minor Car Repairs', type: 'bad', frequency: 3, requirements: { hasCar: true, owner: 'spouse', carAge: { min: 5, max: 10 } }, effects: { laborIfHomeRepairBelow: 20, laborCost: 100, parts: 300, stress: 0 }, isGoodDeedOpportunity: false, goodDeedOptions: [] },
    { name: 'Minor Car Repairs', type: 'bad', frequency: 5, requirements: { hasCar: true, owner: 'spouse', carAge: { min: 11 } },         effects: { laborIfHomeRepairBelow: 20, laborCost: 100, parts: 300, stress: 0 }, isGoodDeedOpportunity: false, goodDeedOptions: [] },

    // ── Bad Cards — Major Car Repairs ────────────────────────────────────────
    // Fix #1: location-aware ride options on good deed; Fix #2: laborIfNoMechanic stays (job-based, not skill threshold)
    { name: 'Major Car Repairs', type: 'bad', frequency: 1, requirements: { hasCar: true, owner: 'player', carAge: { max: 4 } },        effects: { laborIfNoMechanic: true, laborCost: 100, parts: 2000, stress: 10 }, isGoodDeedOpportunity: true, goodDeedOptions: rideOptions },
    { name: 'Major Car Repairs', type: 'bad', frequency: 3, requirements: { hasCar: true, owner: 'player', carAge: { min: 5, max: 10 } }, effects: { laborIfNoMechanic: true, laborCost: 100, parts: 2000, stress: 10 }, isGoodDeedOpportunity: true, goodDeedOptions: rideOptions },
    { name: 'Major Car Repairs', type: 'bad', frequency: 5, requirements: { hasCar: true, owner: 'player', carAge: { min: 11 } },         effects: { laborIfNoMechanic: true, laborCost: 100, parts: 2000, stress: 10 }, isGoodDeedOpportunity: true, goodDeedOptions: rideOptions },

    { name: 'Major Car Repairs', type: 'bad', frequency: 1, requirements: { hasCar: true, owner: 'spouse', carAge: { max: 4 } },        effects: { laborIfNoMechanic: true, laborCost: 100, parts: 2000, stress: 5 }, isGoodDeedOpportunity: false, goodDeedOptions: [] },
    { name: 'Major Car Repairs', type: 'bad', frequency: 3, requirements: { hasCar: true, owner: 'spouse', carAge: { min: 5, max: 10 } }, effects: { laborIfNoMechanic: true, laborCost: 100, parts: 2000, stress: 5 }, isGoodDeedOpportunity: false, goodDeedOptions: [] },
    { name: 'Major Car Repairs', type: 'bad', frequency: 5, requirements: { hasCar: true, owner: 'spouse', carAge: { min: 11 } },         effects: { laborIfNoMechanic: true, laborCost: 100, parts: 2000, stress: 5 }, isGoodDeedOpportunity: false, goodDeedOptions: [] },

    // ── Bad Cards — Motorcycle Repairs ───────────────────────────────────────
    { name: 'Motorcycle Repairs', type: 'bad', frequency: 3,
      requirements: { vehicle: 'motorcycle', owner: 'player', vehicleAge: { min: 15 } },
      effects: { laborIfNoMechanic: true, laborCost: 100, parts: 2000, stress: 15 },
      isGoodDeedOpportunity: true, goodDeedOptions: rideOptions },

    { name: 'Motorcycle Repairs', type: 'bad', frequency: 3,
      requirements: { vehicle: 'motorcycle', owner: 'spouse', vehicleAge: { min: 15 } },
      effects: { laborIfNoMechanic: true, laborCost: 100, parts: 2000, stress: 0 },
      isGoodDeedOpportunity: false, goodDeedOptions: [] },

    // ── Bad Cards — Motorcycle Accident ──────────────────────────────────────
    // Fix #3: full insurance effects — fault roll, vehicle payout, health costs, insurance increase
    { name: 'Motorcycle Accident', type: 'bad', frequency: 4,
      requirements: { vehicle: 'motorcycle', owner: 'player', caution: { max: 40 } },
      effects: {
        healthTemp: -4, healthPerm: -6, stress: 10,
        insurance: {
          faultRoll: { atFaultChance: 75, notAtFaultChance: 25 },
          vehiclePayoutIfNotAtFault: 2500,
          vehicleCoveredIfAtFault: false,
          costWithInsurance: 20000,
          costWithoutInsurance: 180000,
          insuranceIncreaseIfAtFault: 50,
          insuranceIncreaseIfNotAtFault: 20,
        },
      },
      isGoodDeedOpportunity: true, goodDeedOptions: rideOptions },

    { name: 'Motorcycle Accident', type: 'bad', frequency: 3,
      requirements: { vehicle: 'motorcycle', owner: 'player', caution: { min: 40, max: 70 } },
      effects: {
        healthTemp: -2, healthPerm: -3, stress: 10,
        insurance: {
          faultRoll: { atFaultChance: 50, notAtFaultChance: 50 },
          vehiclePayoutIfNotAtFault: 2500,
          vehicleCoveredIfAtFault: false,
          costWithInsurance: 20000,
          costWithoutInsurance: 180000,
          insuranceIncreaseIfAtFault: 50,
          insuranceIncreaseIfNotAtFault: 20,
        },
      },
      isGoodDeedOpportunity: true, goodDeedOptions: rideOptions },

    { name: 'Motorcycle Accident', type: 'bad', frequency: 2,
      requirements: { vehicle: 'motorcycle', owner: 'player', caution: { min: 70 } },
      effects: {
        healthTemp: -4, healthPerm: -1, stress: 5,
        insurance: {
          faultRoll: { atFaultChance: 25, notAtFaultChance: 75 },
          vehiclePayoutIfNotAtFault: 2500,
          vehicleCoveredIfAtFault: false,
          costWithInsurance: 20000,
          costWithoutInsurance: 180000,
          insuranceIncreaseIfAtFault: 50,
          insuranceIncreaseIfNotAtFault: 20,
        },
      },
      isGoodDeedOpportunity: true, goodDeedOptions: rideOptions },

    // Spouse motorcycle accident (50-50 fault, no caution requirement per CSV)
    { name: 'Motorcycle Accident', type: 'bad', frequency: 3,
      requirements: { vehicle: 'motorcycle', owner: 'spouse' },
      effects: {
        stress: 0,
        insurance: {
          faultRoll: { atFaultChance: 50, notAtFaultChance: 50 },
          vehiclePayoutIfNotAtFault: 2500,
          vehicleCoveredIfAtFault: false,
          costWithInsurance: 20000,
          costWithoutInsurance: 180000,
          insuranceIncreaseIfAtFault: 50,
          insuranceIncreaseIfNotAtFault: 20,
        },
      },
      isGoodDeedOpportunity: true, goodDeedOptions: rideOptions },

    // ── Bad Cards — Minor Car Accident ───────────────────────────────────────
    // Fix #3: full insurance effects — fault roll, half-car-value payout if not at fault
    { name: 'Minor Car Accident', type: 'bad', frequency: 4,
      requirements: { hasCar: true, owner: 'player', caution: { max: 30 } },
      effects: {
        healthTemp: -2, stress: 10,
        insurance: {
          faultRoll: { atFaultChance: 75, notAtFaultChance: 25 },
          vehiclePayoutIfNotAtFault: { multiplier: 0.5, basis: "originalCarCost" },
          vehicleCoveredIfAtFault: false,
          costWithInsurance: 250,
          costWithoutInsurance: 1000,
          insuranceIncreaseIfAtFault: 50,
          insuranceIncreaseIfNotAtFault: 20,
        },
      },
      isGoodDeedOpportunity: false, goodDeedOptions: [] },

    { name: 'Minor Car Accident', type: 'bad', frequency: 3,
      requirements: { hasCar: true, owner: 'player', caution: { min: 30, max: 60 } },
      effects: {
        healthTemp: -2, stress: 5,
        insurance: {
          faultRoll: { atFaultChance: 50, notAtFaultChance: 50 },
          vehiclePayoutIfNotAtFault: { multiplier: 0.5, basis: "originalCarCost" },
          vehicleCoveredIfAtFault: false,
          costWithInsurance: 250,
          costWithoutInsurance: 1000,
          insuranceIncreaseIfAtFault: 50,
          insuranceIncreaseIfNotAtFault: 20,
        },
      },
      isGoodDeedOpportunity: false, goodDeedOptions: [] },

    { name: 'Minor Car Accident', type: 'bad', frequency: 2,
      requirements: { hasCar: true, owner: 'player', caution: { min: 60 } },
      effects: {
        healthTemp: -2, stress: 15,
        insurance: {
          faultRoll: { atFaultChance: 25, notAtFaultChance: 75 },
          vehiclePayoutIfNotAtFault: { multiplier: 0.5, basis: "originalCarCost" },
          vehicleCoveredIfAtFault: false,
          costWithInsurance: 250,
          costWithoutInsurance: 1000,
          insuranceIncreaseIfAtFault: 50,
          insuranceIncreaseIfNotAtFault: 20,
        },
      },
      isGoodDeedOpportunity: false, goodDeedOptions: [] },

    // Spouse minor car accident (50-50 fault, no caution requirement per CSV)
    { name: 'Minor Car Accident', type: 'bad', frequency: 3,
      requirements: { hasCar: true, owner: 'spouse' },
      effects: {
        insurance: {
          faultRoll: { atFaultChance: 50, notAtFaultChance: 50 },
          vehiclePayoutIfNotAtFault: { multiplier: 0.5, basis: "originalCarCost" },
          vehicleCoveredIfAtFault: false,
          costWithInsurance: 250,
          costWithoutInsurance: 1000,
          insuranceIncreaseIfAtFault: 50,
          insuranceIncreaseIfNotAtFault: 20,
        },
      },
      isGoodDeedOpportunity: false, goodDeedOptions: [] },

    // ── Bad Cards — Car Totaled ──────────────────────────────────────────────
    // Fix #3: full insurance effects — fault roll, half-car-value payout if not at fault
    { name: 'Car Totaled', type: 'bad', frequency: 5,
      requirements: { hasCar: true, owner: 'player', caution: { max: 30 } },
      effects: {
        healthTemp: -2, healthPerm: -1, stress: 15,
        insurance: {
          faultRoll: { atFaultChance: 75, notAtFaultChance: 25 },
          vehiclePayoutIfNotAtFault: { multiplier: 0.5, basis: "originalCarCost" },
          vehicleCoveredIfAtFault: false,
          costWithInsurance: 250,
          costWithoutInsurance: 1000,
          insuranceIncreaseIfAtFault: 50,
          insuranceIncreaseIfNotAtFault: 20,
        },
      },
      isGoodDeedOpportunity: true, goodDeedOptions: rideOptions },

    { name: 'Car Totaled', type: 'bad', frequency: 3,
      requirements: { hasCar: true, owner: 'player', caution: { min: 30, max: 60 } },
      effects: {
        healthTemp: -2, healthPerm: -1, stress: 15,
        insurance: {
          faultRoll: { atFaultChance: 50, notAtFaultChance: 50 },
          vehiclePayoutIfNotAtFault: { multiplier: 0.5, basis: "originalCarCost" },
          vehicleCoveredIfAtFault: false,
          costWithInsurance: 250,
          costWithoutInsurance: 1000,
          insuranceIncreaseIfAtFault: 50,
          insuranceIncreaseIfNotAtFault: 20,
        },
      },
      isGoodDeedOpportunity: true, goodDeedOptions: rideOptions },

    { name: 'Car Totaled', type: 'bad', frequency: 2,
      requirements: { hasCar: true, owner: 'player', caution: { min: 60 } },
      effects: {
        healthTemp: -2, healthPerm: -1, stress: 15,
        insurance: {
          faultRoll: { atFaultChance: 25, notAtFaultChance: 75 },
          vehiclePayoutIfNotAtFault: { multiplier: 0.5, basis: "originalCarCost" },
          vehicleCoveredIfAtFault: false,
          costWithInsurance: 250,
          costWithoutInsurance: 1000,
          insuranceIncreaseIfAtFault: 50,
          insuranceIncreaseIfNotAtFault: 20,
        },
      },
      isGoodDeedOpportunity: true, goodDeedOptions: rideOptions },

    // Spouse car totaled (50-50 fault, no caution requirement per CSV)
    { name: 'Car Totaled', type: 'bad', frequency: 3,
      requirements: { hasCar: true, owner: 'spouse' },
      effects: {
        stress: 10,
        insurance: {
          faultRoll: { atFaultChance: 50, notAtFaultChance: 50 },
          vehiclePayoutIfNotAtFault: { multiplier: 0.5, basis: "originalCarCost" },
          vehicleCoveredIfAtFault: false,
          costWithInsurance: 250,
          costWithoutInsurance: 1000,
          insuranceIncreaseIfAtFault: 50,
          insuranceIncreaseIfNotAtFault: 20,
        },
      },
      isGoodDeedOpportunity: true, goodDeedOptions: rideOptions },

    // ── Bad Cards — Home ─────────────────────────────────────────────────────
    { name: 'Pest Problems', type: 'bad', frequency: 2, requirements: { housing: ['parents_place', 'college_dorm', 'room_for_rent'] }, effects: { stress: 2  }, isGoodDeedOpportunity: false, goodDeedOptions: [] },
    { name: 'Pest Problems', type: 'bad', frequency: 1, requirements: { housing: ['parents_place', 'college_dorm', 'room_for_rent'] }, effects: { stress: 5  }, isGoodDeedOpportunity: false, goodDeedOptions: [] },
    { name: 'Pest Problems', type: 'bad', frequency: 2, requirements: { housing: ['studio', '1_bedroom', '2_bedroom'] },             effects: { cost: 200,  stress: 5  }, isGoodDeedOpportunity: false, goodDeedOptions: [] },
    { name: 'Pest Problems', type: 'bad', frequency: 1, requirements: { housing: ['studio', '1_bedroom', '2_bedroom'] },             effects: { cost: 3000, stress: 10 }, isGoodDeedOpportunity: false, goodDeedOptions: [] },
    { name: 'Pest Problems', type: 'bad', frequency: 2, requirements: { housing: ['3_bedroom', '4_bedroom'] },                       effects: { cost: 250,  stress: 5  }, isGoodDeedOpportunity: false, goodDeedOptions: [] },
    { name: 'Pest Problems', type: 'bad', frequency: 1, requirements: { housing: ['3_bedroom', '4_bedroom'] },                       effects: { cost: 5000, stress: 10 }, isGoodDeedOpportunity: false, goodDeedOptions: [] },
    { name: 'Pest Problems', type: 'bad', frequency: 2, requirements: { housing: ['5_bedroom', '6_bedroom'] },                       effects: { cost: 350,  stress: 5  }, isGoodDeedOpportunity: false, goodDeedOptions: [] },
    { name: 'Pest Problems', type: 'bad', frequency: 1, requirements: { housing: ['5_bedroom', '6_bedroom'] },                       effects: { cost: 7000, stress: 10 }, isGoodDeedOpportunity: false, goodDeedOptions: [] },

    { name: 'Plumbing Problem', type: 'bad', frequency: 4, requirements: { housing: ['parents_place', 'college_dorm', 'room_for_rent'] }, effects: { stress: 5  }, isGoodDeedOpportunity: false, goodDeedOptions: [] },
    { name: 'Plumbing Problem', type: 'bad', frequency: 4, requirements: { notCommunalHousing: true }, effects: { laborIfHomeRepairBelow: 20, laborCost: 150, parts: 50,   stress: 5  }, isGoodDeedOpportunity: false, goodDeedOptions: [] },
    { name: 'Plumbing Problem', type: 'bad', frequency: 2, requirements: { housing: ['parents_place', 'college_dorm', 'room_for_rent'] }, effects: { stress: 5  }, isGoodDeedOpportunity: false, goodDeedOptions: [] },
    { name: 'Plumbing Problem', type: 'bad', frequency: 2, requirements: { notCommunalHousing: true }, effects: { laborIfNoPlumber: true, laborCost: 2400, parts: 500,  stress: 10 }, isGoodDeedOpportunity: false, goodDeedOptions: [] },
    { name: 'Plumbing Problem', type: 'bad', frequency: 1, requirements: { housing: ['parents_place', 'college_dorm', 'room_for_rent'] }, effects: { stress: 10 }, isGoodDeedOpportunity: false, goodDeedOptions: [] },
    { name: 'Plumbing Problem', type: 'bad', frequency: 1, requirements: { notCommunalHousing: true }, effects: { laborIfNoPlumber: true, laborCost: 12000, parts: 1500, stress: 15 }, isGoodDeedOpportunity: false, goodDeedOptions: [] },

    { name: 'Electrical Problem', type: 'bad', frequency: 2, requirements: { housing: ['parents_place', 'college_dorm', 'room_for_rent'] }, effects: { stress: 2 }, isGoodDeedOpportunity: false, goodDeedOptions: [] },
    { name: 'Electrical Problem', type: 'bad', frequency: 2, requirements: { notCommunalHousing: true }, effects: { laborIfNoElectrician: true, laborCost: 200, parts: 50, stress: 2 }, isGoodDeedOpportunity: false, goodDeedOptions: [] },

    { name: 'Minor House Repairs', type: 'bad', frequency: 3, requirements: { housing: ['parents_place', 'college_dorm', 'room_for_rent'] }, effects: { stress: 2 }, isGoodDeedOpportunity: false, goodDeedOptions: [] },
    { name: 'Minor House Repairs', type: 'bad', frequency: 3, requirements: { notCommunalHousing: true }, effects: { laborIfNoCarpenter: true, laborCost: 300, parts: 200, stress: 5 }, isGoodDeedOpportunity: false, goodDeedOptions: [] },

    { name: 'Major House Fire',  type: 'bad', frequency: 2, requirements: { location: 'suburb' }, effects: { costWithInsurancePct: 10, costWithoutInsurancePct: 40, carpentryDiscountPct: 40, healthTemp: -2, stress: 15, stressTolerance: 5, timeBlocks: -4 }, isGoodDeedOpportunity: true,  goodDeedOptions: [{ description: 'Donate household items', cost: 0, lemonsReward: 2, timeBlocks: 0 }] },
    { name: 'Small House Fire',  type: 'bad', frequency: 2, requirements: {},                     effects: { costWithInsurancePct: 2,  costWithoutInsurancePct: 10, carpentryDiscountPct: 40, healthTemp: -1, stress: 10, stressTolerance: 2, timeBlocks: -2 }, isGoodDeedOpportunity: false, goodDeedOptions: [] },
    { name: 'Tree Fell on House',type: 'bad', frequency: 2, requirements: { location: 'suburb' }, effects: { costWithInsurancePct: 6,  costWithoutInsurancePct: 25, carpentryDiscountPct: 40,                stress: 10, stressTolerance: 2, timeBlocks: -2 }, isGoodDeedOpportunity: false, goodDeedOptions: [] },
    { name: 'Home Burglarized',  type: 'bad', frequency: 2, requirements: {},                     effects: { costWithInsurancePct: 1,  costWithoutInsurancePct: 5,  stress: 5, cautionIfLow: 2 }, isGoodDeedOpportunity: false, goodDeedOptions: [] },

    // ── Bad Cards — Tech / Job ───────────────────────────────────────────────
    { name: 'Tech Problems',           type: 'bad', frequency: 5, requirements: { technology: { max: 15 } }, effects: { stress: 5 },           isGoodDeedOpportunity: false, goodDeedOptions: [] },
    { name: 'Tech Problems',           type: 'bad', frequency: 2, requirements: {},                          effects: { cost: 1000, stress: 10 }, isGoodDeedOpportunity: false, goodDeedOptions: [] },
    { name: 'You Lost Your Job',       type: 'bad', frequency: 1, requirements: { hasJob: true },            effects: { loseJob: true },         isGoodDeedOpportunity: false, goodDeedOptions: [] },
    { name: 'Your Spouse Lost Their Job', type: 'bad', frequency: 1, requirements: { spouseHasJob: true },   effects: { spouseLoseJob: true },   isGoodDeedOpportunity: false, goodDeedOptions: [] },
  ];

  // Cards have no unique name constraint — delete all and re-insert for idempotency
  await prisma.card.deleteMany({});
  await prisma.card.createMany({ data: cards });
  console.log(`  ✓ ${cards.length} cards`);
}

