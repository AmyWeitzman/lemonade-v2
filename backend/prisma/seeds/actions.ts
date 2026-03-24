import { PrismaClient } from '@prisma/client';

export async function seedActions(prisma: PrismaClient) {
  const actions = [
    {
        "name": "See a Therapist",
        "category": ["mental-health"],
        "executionType": "both",
        "frequency": "once_per_year",
        "requirements": {},
        "cost": 5200,
        "costFormula": "none",
        "minTimeBlocks": 6,
        "maxTimeBlocks": 6,
        "seniorDiscount": false,
        "effects": {
            "stress": -20,
            "stressTolerance": 10,
            "lemons": 3
        },
        "discounts": {
            "hasInsurance": {
                "cost": 1040
            }
        }
    },
    {
        "name": "Take a Mental Health Day",
        "category": ["mental-health"],
        "executionType": "both",
        "frequency": "unlimited",
        "requirements": {
            "hasPTOOrUnpaidTimeBlocks": true,
            "retiredExempt": true
        },
        "cost": 0,
        "costFormula": "none",
        "minTimeBlocks": 1,
        "maxTimeBlocks": null,
        "seniorDiscount": false,
        "effects": {
            "stressPerPTOBlock": -3,
            "lemonsPerBlock": 1
        },
        "discounts": {}
    },
    {
        "name": "Take a Yoga Class",
        "category": ["physical-health", "mental-health"],
        "executionType": "both",
        "frequency": "unlimited",
        "requirements": {
            "health": 20
        },
        "cost": 115,
        "costFormula": "per_time_block",
        "minTimeBlocks": 1,
        "maxTimeBlocks": null,
        "seniorDiscount": true,
        "effects": {
            "healthPerBlock": 1,
            "stressPerBlock": -1,
            "lemonsPerBlock": 1
        },
        "discounts": {
            "seniorCost": 95
        }
    },
    {
        "name": "Relax",
        "category": ["mental-health"],
        "executionType": "both",
        "frequency": "unlimited",
        "requirements": {},
        "cost": 0,
        "costFormula": "none",
        "minTimeBlocks": 1,
        "maxTimeBlocks": null,
        "seniorDiscount": false,
        "effects": {
            "stressPerBlock": -3,
            "lemonsPerBlock": 1
        },
        "discounts": {}
    },
    {
        "name": "Go to the Zoo",
        "category": ["entertainment", "animals"],
        "executionType": "both",
        "frequency": "unlimited",
        "requirements": {},
        "cost": 35,
        "costFormula": "per_person_per_time_block",
        "minTimeBlocks": 1,
        "maxTimeBlocks": null,
        "seniorDiscount": true,
        "effects": {
            "lemonsPerBlock": 1,
            "goodWithKidsIfKidsUnder11": 1
        },
        "discounts": {
            "seniorCost": 12
        }
    },
    {
        "name": "Go to the Aquarium",
        "category": ["entertainment", "animals"],
        "executionType": "both",
        "frequency": "unlimited",
        "requirements": {},
        "cost": 65,
        "costFormula": "per_person_per_time_block",
        "minTimeBlocks": 1,
        "maxTimeBlocks": null,
        "seniorDiscount": true,
        "effects": {
            "lemonsPerBlock": 1,
            "goodWithKidsIfKidsUnder11": 1
        },
        "discounts": {
            "seniorCost": 50
        }
    },
    {
        "name": "Go to a Concert",
        "category": ["entertainment"],
        "executionType": "both",
        "frequency": "unlimited",
        "requirements": {},
        "cost": 250,
        "costFormula": "per_time_block",
        "minTimeBlocks": 1,
        "maxTimeBlocks": null,
        "seniorDiscount": false,
        "effects": {
            "lemonsPerBlock": 1
        },
        "discounts": {}
    },
    {
        "name": "Go to a Play",
        "category": ["entertainment"],
        "executionType": "both",
        "frequency": "unlimited",
        "requirements": {},
        "cost": 175,
        "costFormula": "per_person_per_time_block",
        "minTimeBlocks": 1,
        "maxTimeBlocks": null,
        "seniorDiscount": false,
        "effects": {
            "lemonsPerBlock": 1
        },
        "discounts": {}
    },
    {
        "name": "Go to the County Fair",
        "category": ["entertainment", "animals"],
        "executionType": "both",
        "frequency": "unlimited",
        "requirements": {},
        "cost": 70,
        "costFormula": "per_person_per_time_block",
        "minTimeBlocks": 1,
        "maxTimeBlocks": null,
        "seniorDiscount": false,
        "effects": {
            "lemonsPerBlock": 1,
            "goodWithKidsIfKidsUnder11": 1
        },
        "discounts": {}
    },
    {
        "name": "Go to a Sports Game",
        "category": ["entertainment"],
        "executionType": "both",
        "frequency": "unlimited",
        "requirements": {},
        "cost": 125,
        "costFormula": "per_person_per_time_block",
        "minTimeBlocks": 1,
        "maxTimeBlocks": null,
        "seniorDiscount": true,
        "effects": {
            "lemonsPerBlock": 1,
            "goodWithKidsIfKidsUnder18": 1
        },
        "discounts": {
            "seniorCost": 100
        }
    },
    {
        "name": "Go to an Amusement Park",
        "category": ["entertainment"],
        "executionType": "both",
        "frequency": "unlimited",
        "requirements": {},
        "cost": 90,
        "costFormula": "per_person_per_time_block",
        "minTimeBlocks": 1,
        "maxTimeBlocks": null,
        "seniorDiscount": false,
        "effects": {
            "lemonsPerBlock": 1,
            "goodWithKidsIfKidsUnder18": 1
        },
        "discounts": {}
    },
    {
        "name": "Go to the Movies",
        "category": ["entertainment"],
        "executionType": "both",
        "frequency": "unlimited",
        "requirements": {},
        "cost": 25,
        "costFormula": "per_person_per_time_block",
        "minTimeBlocks": 1,
        "maxTimeBlocks": null,
        "seniorDiscount": true,
        "effects": {
            "lemonsPerBlock": 1
        },
        "discounts": {
            "seniorCost": 18
        }
    },
    {
        "name": "Go to the Library",
        "category": ["entertainment"],
        "executionType": "both",
        "frequency": "unlimited",
        "requirements": {},
        "cost": 0,
        "costFormula": "none",
        "minTimeBlocks": 1,
        "maxTimeBlocks": null,
        "seniorDiscount": false,
        "effects": {
            "lemonsPerBlock": 1,
            "goodWithKidsIfKidsUnder11": 1
        },
        "discounts": {}
    },
    {
        "name": "Go to a Museum",
        "category": ["entertainment"],
        "executionType": "both",
        "frequency": "unlimited",
        "requirements": {},
        "cost": 20,
        "costFormula": "per_person_per_time_block",
        "minTimeBlocks": 1,
        "maxTimeBlocks": null,
        "seniorDiscount": true,
        "effects": {
            "lemonsPerBlock": 1,
            "goodWithKidsIfKidsUnder18": 1
        },
        "discounts": {
            "seniorCost": 15
        }
    },
    {
        "name": "Do Karaoke",
        "category": ["entertainment", "social-connections"],
        "executionType": "both",
        "frequency": "unlimited",
        "requirements": {},
        "cost": 0,
        "costFormula": "none",
        "minTimeBlocks": 1,
        "maxTimeBlocks": null,
        "seniorDiscount": false,
        "effects": {
            "musicPerBlock": 1,
            "braveryPerBlock": 3,
            "lemonsPerBlock": 1
        },
        "discounts": {}
    },
    {
        "name": "Game Night",
        "category": ["social-connections", "entertainment"],
        "executionType": "both",
        "frequency": "unlimited",
        "requirements": {},
        "cost": 0,
        "costFormula": "none",
        "minTimeBlocks": 1,
        "maxTimeBlocks": null,
        "seniorDiscount": false,
        "effects": {
            "lemonsPerBlock": 1,
            "goodWithKidsIfKidsUnder18": 1
        },
        "discounts": {}
    },
    {
        "name": "Go Ice Skating",
        "category": ["entertainment"],
        "executionType": "both",
        "frequency": "unlimited",
        "requirements": {
            "health": 40
        },
        "cost": 75,
        "costFormula": "per_person_per_time_block",
        "minTimeBlocks": 1,
        "maxTimeBlocks": null,
        "seniorDiscount": false,
        "effects": {
            "lemonsPerBlock": 1,
            "goodWithKidsIfKidsUnder8": 1
        },
        "discounts": {}
    },
    {
        "name": "Watch a Science Documentary",
        "category": ["entertainment", "skill-development"],
        "executionType": "both",
        "frequency": "unlimited",
        "requirements": {},
        "cost": 0,
        "costFormula": "none",
        "minTimeBlocks": 1,
        "maxTimeBlocks": null,
        "seniorDiscount": false,
        "effects": {
            "sciencePerBlock": 1,
            "lemonsPerBlock": 1,
            "goodWithKidsIfKidsUnder18": 1
        },
        "discounts": {}
    },
    {
        "name": "Go in the Pool",
        "category": ["entertainment", "outdoors"],
        "executionType": "both",
        "frequency": "unlimited",
        "requirements": {
            "hasPool": true
        },
        "cost": 0,
        "costFormula": "none",
        "minTimeBlocks": 1,
        "maxTimeBlocks": 3,
        "seniorDiscount": false,
        "effects": {
            "lemonsPerBlock": 1
        },
        "discounts": {}
    },
    {
        "name": "Join a Book Club",
        "category": ["social-connections", "entertainment"],
        "executionType": "both",
        "frequency": "unlimited",
        "requirements": {},
        "cost": 0,
        "costFormula": "none",
        "minTimeBlocks": 1,
        "maxTimeBlocks": null,
        "seniorDiscount": false,
        "effects": {
            "sociabilityPerBlock": 1,
            "analysisPerBlock": 1,
            "lemonsPerBlock": 1
        },
        "discounts": {}
    },
    {
        "name": "Go Snorkeling",
        "category": ["entertainment", "outdoors"],
        "executionType": "both",
        "frequency": "unlimited",
        "requirements": {
            "health": 40
        },
        "cost": 80,
        "costFormula": "per_person_per_time_block",
        "minTimeBlocks": 1,
        "maxTimeBlocks": null,
        "seniorDiscount": false,
        "effects": {
            "lemonsPerBlock": 1
        },
        "discounts": {}
    },
    {
        "name": "Travel Locally",
        "category": ["travel"],
        "executionType": "both",
        "frequency": "unlimited",
        "requirements": {},
        "cost": 100,
        "costFormula": "per_person_per_time_block",
        "minTimeBlocks": 1,
        "maxTimeBlocks": null,
        "seniorDiscount": false,
        "effects": {
            "stressPerTrip": -5,
            "lemonsPerTrip": 2,
            "goodWithKidsIfKidsUnder18PerTrip": 2
        },
        "discounts": {}
    },
    {
        "name": "Travel Domestically",
        "category": ["travel"],
        "executionType": "both",
        "frequency": "unlimited",
        "requirements": {
            "ptoOrUnpaidTimeBlocks": 1,
            "retiredExempt": true
        },
        "cost": 1000,
        "costFormula": "per_person_per_time_block",
        "minTimeBlocks": 2,
        "maxTimeBlocks": null,
        "timeBlockIncrement": 2,
        "seniorDiscount": false,
        "effects": {
            "stressPerTrip": -3,
            "lemonsPerTrip": 2,
            "goodWithKidsIfKidsUnder18PerTrip": 2,
            "petBoarding": {
                "largePet": 280,
                "smallPet": 70
            }
        },
        "discounts": {}
    },
    {
        "name": "Travel Internationally",
        "category": ["travel", "luxury"],
        "executionType": "both",
        "frequency": "unlimited",
        "requirements": {
            "ptoOrUnpaidTimeBlocks": 2,
            "retiredExempt": true
        },
        "cost": 3700,
        "costFormula": "per_person_per_time_block",
        "minTimeBlocks": 3,
        "maxTimeBlocks": null,
        "timeBlockIncrement": 3,
        "seniorDiscount": false,
        "effects": {
            "stressPerTrip": -1,
            "lemonsPerTrip": 2,
            "goodWithKidsIfKidsUnder18PerTrip": 2,
            "petBoarding": {
                "largePet": 560,
                "smallPet": 140
            }
        },
        "discounts": {}
    },
    {
        "name": "Go Kayaking",
        "category": ["outdoors", "physical-health"],
        "executionType": "both",
        "frequency": "unlimited",
        "requirements": {
            "health": 40
        },
        "cost": 50,
        "costFormula": "per_person_per_time_block",
        "minTimeBlocks": 1,
        "maxTimeBlocks": null,
        "seniorDiscount": false,
        "effects": {
            "lemonsPerBlock": 1,
            "goodWithKidsIfKidsUnder18": 1
        },
        "discounts": {}
    },
    {
        "name": "Go Skiing",
        "category": ["outdoors", "physical-health"],
        "executionType": "both",
        "frequency": "unlimited",
        "requirements": {
            "health": 40
        },
        "cost": 150,
        "costFormula": "per_person_per_time_block",
        "minTimeBlocks": 1,
        "maxTimeBlocks": null,
        "seniorDiscount": false,
        "effects": {
            "lemonsPerBlock": 1,
            "goodWithKidsIfKidsUnder18": 1
        },
        "discounts": {}
    },
    {
        "name": "Go to the Beach",
        "category": ["outdoors"],
        "executionType": "both",
        "frequency": "unlimited",
        "requirements": {},
        "cost": 15,
        "costFormula": "per_time_block",
        "minTimeBlocks": 1,
        "maxTimeBlocks": null,
        "seniorDiscount": false,
        "effects": {
            "lemonsPerBlock": 1,
            "goodWithKidsIfKidsUnder18": 1
        },
        "discounts": {}
    },
    {
        "name": "Go on a Picnic",
        "category": ["outdoors"],
        "executionType": "both",
        "frequency": "unlimited",
        "requirements": {},
        "cost": 0,
        "costFormula": "none",
        "minTimeBlocks": 1,
        "maxTimeBlocks": null,
        "seniorDiscount": false,
        "effects": {
            "lemonsPerBlock": 1,
            "goodWithKidsIfKidsUnder18": 1
        },
        "discounts": {}
    },
    {
        "name": "Go Hiking",
        "category": ["outdoors", "physical-health"],
        "executionType": "both",
        "frequency": "unlimited",
        "requirements": {
            "health": 50
        },
        "cost": 0,
        "costFormula": "none",
        "minTimeBlocks": 1,
        "maxTimeBlocks": null,
        "seniorDiscount": false,
        "effects": {
            "healthPerBlock": 1,
            "lemonsPerBlock": 1
        },
        "discounts": {}
    },
    {
        "name": "Go Camping",
        "category": ["outdoors"],
        "executionType": "both",
        "frequency": "unlimited",
        "requirements": {
            "minCarSeatsForFamily": true
        },
        "cost": 25,
        "costFormula": "base_plus_per_person_per_time_block",
        "baseCost": 200,
        "minTimeBlocks": 1,
        "maxTimeBlocks": null,
        "seniorDiscount": false,
        "effects": {
            "lemonsPerBlock": 1
        },
        "discounts": {}
    },
    {
        "name": "Go on Bike Ride",
        "category": ["outdoors", "physical-health"],
        "executionType": "both",
        "frequency": "unlimited",
        "requirements": {},
        "cost": 325,
        "costFormula": "per_time_block",
        "minTimeBlocks": 1,
        "maxTimeBlocks": null,
        "seniorDiscount": false,
        "effects": {
            "lemonsPerBlock": 1,
            "healthPerBlock": 1
        },
        "discounts": {
            "hasBike": {
                "cost": 0
            }
        }
    },
    {
        "name": "Stargaze",
        "category": ["outdoors"],
        "executionType": "both",
        "frequency": "unlimited",
        "requirements": {},
        "cost": 0,
        "costFormula": "none",
        "minTimeBlocks": 1,
        "maxTimeBlocks": null,
        "seniorDiscount": false,
        "effects": {
            "lemonsPerBlock": 1
        },
        "discounts": {}
    },
    {
        "name": "Go to the Park",
        "category": ["outdoors"],
        "executionType": "both",
        "frequency": "unlimited",
        "requirements": {},
        "cost": 0,
        "costFormula": "none",
        "minTimeBlocks": 1,
        "maxTimeBlocks": null,
        "seniorDiscount": false,
        "effects": {
            "lemonsPerBlock": 1,
            "goodWithKidsIfKidsUnder18": 1
        },
        "discounts": {}
    },
    {
        "name": "Go to the Gym",
        "category": ["physical-health"],
        "executionType": "both",
        "frequency": "unlimited",
        "requirements": {
            "health": 40
        },
        "cost": 500,
        "costFormula": "none",
        "minTimeBlocks": 1,
        "maxTimeBlocks": null,
        "seniorDiscount": true,
        "effects": {
            "healthPerBlock": 1,
            "physicalAbilityPerBlock": 1,
            "stressPerBlock": -1,
            "lemonsPerBlock": 1
        },
        "discounts": {
            "seniorCost": 120,
            "freeForJobs": [
                "Fitness Instructor",
                "Firefighter",
                "Police Officer",
                "Astronaut"
            ]
        }
    },
    {
        "name": "Run a Marathon",
        "category": ["physical-health", "outdoors"],
        "executionType": "both",
        "frequency": "twice_per_year",
        "requirements": {
            "health": 60
        },
        "cost": 20,
        "costFormula": "none",
        "minTimeBlocks": 12,
        "maxTimeBlocks": 12,
        "seniorDiscount": false,
        "effects": {
            "health": 5,
            "perseverance": 15,
            "lemons": 2,
            "stress": 5
        },
        "discounts": {}
    },
    {
        "name": "Go Indoor Rock Climbing",
        "category": ["physical-health"],
        "executionType": "both",
        "frequency": "unlimited",
        "requirements": {
            "health": 60
        },
        "cost": 65,
        "costFormula": "per_person_per_time_block",
        "minTimeBlocks": 1,
        "maxTimeBlocks": null,
        "seniorDiscount": false,
        "effects": {
            "physicalAbilityPerBlock": 3,
            "cautionPerBlock": 1,
            "lemonsPerBlock": 1,
            "goodWithKidsIfKidsUnder16": 1
        },
        "discounts": {}
    },
    {
        "name": "Go Out to Dinner",
        "category": ["social-connections"],
        "executionType": "both",
        "frequency": "unlimited",
        "requirements": {},
        "cost": 15,
        "costFormula": "per_person",
        "minTimeBlocks": 0,
        "maxTimeBlocks": 0,
        "seniorDiscount": false,
        "effects": {
            "lemons": 1
        },
        "discounts": {}
    },
    {
        "name": "Go Out to Fancy Dinner",
        "category": ["social-connections", "luxury"],
        "executionType": "both",
        "frequency": "unlimited",
        "requirements": {},
        "cost": 50,
        "costFormula": "per_person",
        "minTimeBlocks": 0,
        "maxTimeBlocks": 0,
        "seniorDiscount": false,
        "effects": {
            "lemons": 1
        },
        "discounts": {}
    },
    {
        "name": "Hang Out with Friends",
        "category": ["social-connections"],
        "executionType": "both",
        "frequency": "unlimited",
        "requirements": {},
        "cost": 0,
        "costFormula": "none",
        "minTimeBlocks": 1,
        "maxTimeBlocks": null,
        "seniorDiscount": false,
        "effects": {
            "lemonsPerBlock": 1
        },
        "discounts": {}
    },
    {
        "name": "Spend Time with Grandkids",
        "category": ["family", "social-connections"],
        "executionType": "both",
        "frequency": "unlimited",
        "requirements": {
            "hasGrandkids": true
        },
        "cost": 0,
        "costFormula": "none",
        "minTimeBlocks": 1,
        "maxTimeBlocks": null,
        "seniorDiscount": false,
        "effects": {
            "lemonsPerGrandkidPerBlock": 1,
            "healthPerBlock": 1,
            "goodWithKidsPerBlock": 1
        },
        "discounts": {}
    },
    {
        "name": "Spend Money on Grandkids",
        "category": ["family"],
        "executionType": "both",
        "frequency": "unlimited",
        "requirements": {
            "hasGrandkids": true
        },
        "cost": 20,
        "costFormula": "per_person",
        "minTimeBlocks": 0,
        "maxTimeBlocks": 0,
        "seniorDiscount": false,
        "userInput": {
            "type": "amount_per_grandchild",
            "min": 20
        },
        "effects": {
            "lemonsPerGrandkidPerBlock": 1,
            "healthPerBlock": 1,
            "goodWithKidsPerBlock": 1
        },
        "discounts": {}
    },
    {
        "name": "Donate to Charity",
        "category": ["community"],
        "executionType": "both",
        "frequency": "once_per_year",
        "requirements": {},
        "cost": 0,
        "costFormula": "none",
        "minTimeBlocks": 0,
        "maxTimeBlocks": 0,
        "seniorDiscount": false,
        "userInput": {
            "type": "amount",
            "min": 0
        },
        "effects": {
            "lemons": 10,
            "taxDeduction": true,
            "isGoodDeedOpportunity": true
        },
        "discounts": {}
    },
    {
        "name": "Tutor",
        "category": ["community"],
        "executionType": "both",
        "frequency": "unlimited",
        "requirements": {
            "minSkill": 9
        },
        "cost": 0,
        "costFormula": "none",
        "minTimeBlocks": 1,
        "maxTimeBlocks": null,
        "seniorDiscount": false,
        "effects": {
            "incomePerBlock": {
                "skill9to10": 115,
                "skill11to30": 180,
                "skill31to50": 300,
                "skill51to100": 450
            },
            "stressPerBlock": 5,
            "lemonsPerBlock": 2
        },
        "discounts": {}
    },
    {
        "name": "Get CPR Certification",
        "category": ["career", "skill-development", "community"],
        "executionType": "both",
        "frequency": "once_per_two_years",
        "requirements": {
            "hasCPRCert": false
        },
        "cost": 45,
        "costFormula": "none",
        "minTimeBlocks": 0,
        "maxTimeBlocks": 0,
        "seniorDiscount": false,
        "effects": {
            "stressTolerance": 2
        },
        "discounts": {}
    },
    {
        "name": "Volunteer",
        "category": ["community"],
        "executionType": "both",
        "frequency": "unlimited",
        "requirements": {},
        "cost": 0,
        "costFormula": "none",
        "minTimeBlocks": 1,
        "maxTimeBlocks": null,
        "seniorDiscount": false,
        "effects": {
            "compassionPerBlock": 5,
            "sociabilityPerBlock": 3,
            "lemonsPerBlock": 5,
            "isGoodDeedOpportunity": true
        },
        "discounts": {}
    },
    {
        "name": "Coach Children's Sports Team",
        "category": ["community"],
        "executionType": "both",
        "frequency": "unlimited",
        "requirements": {
            "health": 50,
            "physicalAbility": 40
        },
        "cost": 0,
        "costFormula": "none",
        "minTimeBlocks": 2,
        "maxTimeBlocks": 8,
        "timeBlockIncrement": 2,
        "seniorDiscount": false,
        "effects": {
            "goodWithKidsPerBlock": 2,
            "compassionPerBlock": 1,
            "organizationPerBlock": 1,
            "stressPerBlock": 1,
            "lemonsPerBlock": 2
        },
        "discounts": {}
    },
    {
        "name": "Babysit",
        "category": ["community"],
        "executionType": "both",
        "frequency": "unlimited",
        "requirements": {
            "compassion": 30,
            "caution": 30,
            "goodWithKids": 30,
            "patience": 30
        },
        "cost": 0,
        "costFormula": "none",
        "minTimeBlocks": 1,
        "maxTimeBlocks": null,
        "seniorDiscount": false,
        "effects": {
            "incomePerBlock": 150,
            "compassionPerBlock": 1,
            "cautionPerBlock": 1,
            "goodWithKidsPerBlock": 1,
            "patiencePerBlock": 1,
            "stressPerBlock": 1,
            "lemonsPerBlock": 2
        },
        "discounts": {}
    },
    {
        "name": "Be a Lifeguard",
        "category": ["community"],
        "executionType": "both",
        "frequency": "unlimited",
        "requirements": {
            "hasCPRCert": true,
            "health": 70,
            "physicalAbility": 60,
            "stressTolerance": 60
        },
        "cost": 0,
        "costFormula": "none",
        "minTimeBlocks": 6,
        "maxTimeBlocks": 6,
        "seniorDiscount": false,
        "effects": {
            "income": 400,
            "stress": 2,
            "lemons": 4
        },
        "discounts": {}
    },
    {
        "name": "Teach Summer Courses",
        "category": ["community"],
        "executionType": "both",
        "frequency": "once_per_year",
        "requirements": {
            "job": [
                "Teacher",
                "Professor"
            ]
        },
        "cost": 0,
        "costFormula": "none",
        "minTimeBlocks": 4,
        "maxTimeBlocks": 4,
        "seniorDiscount": false,
        "effects": {
            "teacherIncome": 20000,
            "professorIncome": 30000,
            "teacherStress": 15,
            "professorStress": 7,
            "lemons": 3
        },
        "discounts": {}
    },
    {
        "name": "Recycle",
        "category": ["community"],
        "executionType": "both",
        "frequency": "once_per_year",
        "requirements": {},
        "cost": 0,
        "costFormula": "none",
        "minTimeBlocks": 1,
        "maxTimeBlocks": 1,
        "seniorDiscount": false,
        "effects": {
            "lemons": 10,
            "isGoodDeedOpportunity": true
        },
        "discounts": {}
    },
    {
        "name": "Find a Job",
        "category": ["career"],
        "executionType": "express",
        "frequency": "unlimited",
        "requirements": {},
        "cost": 0,
        "costFormula": "none",
        "minTimeBlocks": 2,
        "maxTimeBlocks": 2,
        "seniorDiscount": false,
        "effects": {
            "stress": 15
        },
        "discounts": {}
    },
    {
        "name": "Request PTO",
        "category": ["career"],
        "executionType": "express",
        "frequency": "unlimited",
        "requirements": {
            "hasPTODaysAvailable": true
        },
        "cost": 0,
        "costFormula": "per_person_per_time_block",
        "minTimeBlocks": 0,
        "maxTimeBlocks": 0,
        "seniorDiscount": false,
        "effects": {
            "convertPTODaysToActionBlocks": true
        },
        "discounts": {}
    },
    {
        "name": "Do Continuing Education",
        "category": ["career"],
        "executionType": "express",
        "frequency": "unlimited",
        "requirements": {},
        "cost": 500,
        "costFormula": "per_time_block",
        "minTimeBlocks": 1,
        "maxTimeBlocks": null,
        "seniorDiscount": false,
        "effects": {},
        "discounts": {}
    },
    {
        "name": "Pursue Education",
        "category": ["education"],
        "executionType": "express",
        "frequency": "twice_per_year",
        "requirements": {
            "inSchool": false
        },
        "cost": 0,
        "costFormula": "none",
        "minTimeBlocks": 1,
        "maxTimeBlocks": 1,
        "seniorDiscount": false,
        "effects": {
            "stress": 15
        },
        "discounts": {}
    },
    {
        "name": "Apply for Scholarships",
        "category": ["education"],
        "executionType": "express",
        "frequency": "once_per_year",
        "requirements": {
            "inSchool": true
        },
        "cost": 0,
        "costFormula": "none",
        "minTimeBlocks": 2,
        "maxTimeBlocks": 2,
        "seniorDiscount": false,
        "effects": {
            "stress": 5,
            "scholarshipRoll": [
                { "min": 1, "max": 1, "amount": 5000 },
                { "min": 2, "max": 3, "amount": 10000 },
                { "min": 4, "max": 5, "amount": 15000 },
                { "min": 6, "max": 6, "amount": 20000 }
            ],
            "skillsNeeded": {
                "perseverance": 60,
                "writing": 8,
                "communication": 55
            }
        },
        "discounts": {}
    },
    {
        "name": "Drop Out of School",
        "category": ["education"],
        "executionType": "express",
        "frequency": "unlimited",
        "requirements": {
            "inSchool": true
        },
        "cost": 0,
        "costFormula": "none",
        "minTimeBlocks": 0,
        "maxTimeBlocks": 0,
        "seniorDiscount": false,
        "effects": {
            "dropOut": true
        },
        "discounts": {}
    },
    {
        "name": "Change Major",
        "category": ["education"],
        "executionType": "express",
        "frequency": "unlimited",
        "requirements": {
            "inSchool": true
        },
        "cost": 0,
        "costFormula": "none",
        "minTimeBlocks": 0,
        "maxTimeBlocks": 0,
        "seniorDiscount": false,
        "effects": {
            "changeMajor": true
        },
        "discounts": {}
    },
    {
        "name": "Change School Full-Time/Part-Time",
        "category": ["education"],
        "executionType": "express",
        "frequency": "unlimited",
        "requirements": {
            "inSchool": true
        },
        "cost": 0,
        "costFormula": "none",
        "minTimeBlocks": 0,
        "maxTimeBlocks": 0,
        "seniorDiscount": false,
        "effects": {
            "toggleFTPT": true
        },
        "discounts": {}
    },
    {
        "name": "Do an Internship",
        "category": ["education", "skill-development"],
        "executionType": "both",
        "frequency": "once_per_year",
        "requirements": {
            "inSchool": true
        },
        "cost": 0,
        "costFormula": "none",
        "minTimeBlocks": 4,
        "maxTimeBlocks": 4,
        "seniorDiscount": false,
        "userInput": {
            "type": "dropdown",
            "options": ["Humanities", "Math", "Science", "Technology"]
        },
        "effects": {
            "stress": 10,
            "skillGainsByType": {
                "Humanities": {
                    "communication": 8,
                    "sociability": 10,
                    "compassion": 10,
                    "patience": 10,
                    "charisma": 10,
                    "organization": 2,
                    "creativity": 8
                },
                "Math": {
                    "math": 5,
                    "analysis": 2,
                    "organization": 2,
                    "communication": 2
                },
                "Science": {
                    "science": 5,
                    "analysis": 2,
                    "organization": 2,
                    "caution": 3,
                    "technology": 1,
                    "communication": 2
                },
                "Technology": {
                    "technology": 5,
                    "organization": 2,
                    "communication": 2,
                    "creativity": 3
                }
            }
        },
        "discounts": {}
    },
    {
        "name": "Study Abroad",
        "category": ["education", "skill-development", "luxury"],
        "executionType": "both",
        "frequency": "once_per_year",
        "requirements": {
            "eligibleProgramTypes": ["bachelors"]
        },
        "cost": 1000,
        "costFormula": "none",
        "minTimeBlocks": 0,
        "maxTimeBlocks": 2,
        "seniorDiscount": false,
        "effects": {
            "bravery": {
                "semester": 5,
                "year": 8
            },
            "compassion": {
                "semester": 5,
                "year": 8
            },
            "caution": {
                "semester": 5,
                "year": 8
            },
            "communication": {
                "semester": 5,
                "year": 8
            },
            "lemons": {
                "semester": 2,
                "year": 4
            },
            "stress": {
                "semester": 20,
                "year": 30
            }
        },
        "discounts": {}
    },
    {
        "name": "Join Campus Club",
        "category": ["education", "social-connections", "skill-development"],
        "executionType": "both",
        "frequency": "four_per_year",
        "requirements": {
            "eligibleProgramTypes": ["associates", "bachelors", "masters", "doctorate"]
        },
        "cost": 0,
        "costFormula": "none",
        "minTimeBlocks": 2,
        "maxTimeBlocks": 2,
        "seniorDiscount": false,
        "userInput": {
            "type": "dropdown",
            "options": ["Art", "Science", "Creative Writing", "Robotics", "Band/Orchestra", "Theater", "Model UN", "Intramural Sports", "CS", "Finance"]
        },
        "effects": {
            "lemonsPerBlock": 1,
            "skillGainsByType": {
                "Art":              { "sociability": 5, "art": 2, "creativity": 5 },
                "Science":          { "sociability": 5, "science": 2 },
                "Creative Writing": { "sociability": 5, "writing": 2, "creativity": 5 },
                "Robotics":         { "sociability": 5, "science": 2, "technology": 2, "homeRepair": 2 },
                "Band/Orchestra":   { "sociability": 5, "music": 2 },
                "Theater":          { "sociability": 5, "music": 2, "charisma": 5, "bravery": 5 },
                "Model UN":         { "sociability": 5, "communication": 5 },
                "Intramural Sports":{ "sociability": 5, "physicalAbility": 5 },
                "CS":               { "sociability": 5, "technology": 2 },
                "Finance":          { "sociability": 5, "math": 2, "organization": 5 }
            }
        },
        "discounts": {}
    },
    {
        "name": "Attend Classes",
        "category": ["schoolwork"],
        "executionType": "both",
        "frequency": "once_per_year",
        "requirements": {
            "inSchool": true
        },
        "cost": 0,
        "costFormula": "none",
        "minTimeBlocks": 1,
        "maxTimeBlocks": null,
        "seniorDiscount": false,
        "effects": {
            "skillGains": "program",
            "stressByProgram": {
                "associates": { "H": 12, "S": 16 },
                "bachelors": { "H": 16, "S": 20 },
                "masters": { "H": 5, "S": 6 },
                "vocational": 10,
                "Police Academy": 20,
                "Teaching Credential": 20,
                "Firefighter Academy": 20,
                "Flight School": 20,
                "Law School": 24,
                "Astronaut Academy": 24
            },
            "timeBlocksByProgram": {
                "associates": 8,
                "bachelors": 8,
                "vocational": 8,
                "Police Academy": 8,
                "Teaching Credential": 8,
                "Firefighter Academy": 8,
                "Flight School": 8,
                "Law School": 8,
                "masters": 2,
                "Astronaut Academy": 16
            }
        },
        "discounts": {}
    },
    {
        "name": "Study",
        "category": ["schoolwork"],
        "executionType": "both",
        "frequency": "once_per_year",
        "requirements": {
            "inSchool": true
        },
        "cost": 0,
        "costFormula": "none",
        "minTimeBlocks": 1,
        "maxTimeBlocks": null,
        "seniorDiscount": false,
        "effects": {
            "skillGains": "program",
            "stressByProgram": {
                "associates": { "H": 6, "S": 8 },
                "bachelors": { "H": 8, "S": 10 },
                "masters": { "H": 5, "S": 6 },
                "Police Academy": 10,
                "Firefighter Academy": 10,
                "Flight School": 10,
                "Law School": 24
            },
            "timeBlocksByProgram": {
                "associates": 4,
                "bachelors": 4,
                "Police Academy": 4,
                "Firefighter Academy": 4,
                "Flight School": 4,
                "masters": 2,
                "Astronaut Academy": 2,
                "Law School": 8
            }
        },
        "discounts": {}
    },
    {
        "name": "Complete Coursework",
        "category": ["schoolwork"],
        "executionType": "both",
        "frequency": "once_per_year",
        "requirements": {
            "inSchool": true
        },
        "cost": 0,
        "costFormula": "none",
        "minTimeBlocks": 1,
        "maxTimeBlocks": null,
        "seniorDiscount": false,
        "effects": {
            "skillGains": "program",
            "stressByProgram": {
                "associates": { "H": 12, "S": 16 },
                "bachelors": { "H": 16, "S": 20 },
                "vocational": 10,
                "Police Academy": 20,
                "Firefighter Academy": 20,
                "Flight School": 20,
                "Teaching Credential": 10,
                "Law School": 12
            },
            "timeBlocksByProgram": {
                "associates": 8,
                "bachelors": 8,
                "vocational": 8,
                "Police Academy": 8,
                "Firefighter Academy": 8,
                "Flight School": 8,
                "Teaching Credential": 4,
                "Law School": 4,
                "Astronaut Academy": 2
            }
        },
        "discounts": {}
    },
    {
        "name": "Student Teach",
        "category": ["schoolwork"],
        "executionType": "both",
        "frequency": "once_per_year",
        "requirements": {
            "eligibleProgramNames": ["Teaching Credential"]
        },
        "cost": 0,
        "costFormula": "none",
        "minTimeBlocks": 12,
        "maxTimeBlocks": 12,
        "seniorDiscount": false,
        "effects": {
            "stress": 30
        },
        "discounts": {}
    },
    {
        "name": "Research",
        "category": ["schoolwork"],
        "executionType": "both",
        "frequency": "once_per_year",
        "requirements": {
            "eligibleProgramTypes": ["associates", "bachelors", "masters", "doctorate"]
        },
        "cost": 0,
        "costFormula": "none",
        "minTimeBlocks": 1,
        "maxTimeBlocks": null,
        "seniorDiscount": false,
        "effects": {
            "skillGains": "program",
            "stressByProgram": {
                "associates": {
                    "H": 6,
                    "S": 8
                },
                "bachelors": {
                    "H": 8,
                    "S": 10
                },
                "masters": {
                    "H": 20,
                    "S": 22
                },
                "doctorate": {
                    "H": 25,
                    "S": 27
                }
            },
            "timeBlocksByProgram": {
                "associates": 4,
                "bachelors": 4,
                "masters": 8,
                "doctorate": 10
            }
        },
        "discounts": {}
    },
    {
        "name": "Go to Office Hours",
        "category": ["schoolwork"],
        "executionType": "both",
        "frequency": "once_per_year",
        "requirements": {
            "eligibleProgramTypes": ["associates", "bachelors", "masters"],
            "eligibleProgramNames": ["Law School"]
        },
        "cost": 0,
        "costFormula": "none",
        "minTimeBlocks": 1,
        "maxTimeBlocks": null,
        "seniorDiscount": false,
        "effects": {
            "skillGains": "program",
            "stressByProgram": {
                "associates": {
                    "H": 3,
                    "S": 4
                },
                "bachelors": {
                    "H": 4,
                    "S": 5
                },
                "masters": {
                    "H": 10,
                    "S": 12
                },
                "Law School": 12
            },
            "timeBlocksByProgram": {
                "associates": 2,
                "bachelors": 2,
                "masters": 4,
                "Law School": 4
            }
        },
        "discounts": {}
    },
    {
        "name": "Go to a Review Session",
        "category": ["schoolwork"],
        "executionType": "both",
        "frequency": "once_per_year",
        "requirements": {
            "eligibleProgramTypes": ["associates", "bachelors"],
            "eligibleProgramNames": ["Police Academy", "Firefighter Academy", "Flight School"]
        },
        "cost": 0,
        "costFormula": "none",
        "minTimeBlocks": 1,
        "maxTimeBlocks": null,
        "seniorDiscount": false,
        "effects": {
            "skillGains": "program",
            "stressByProgram": {
                "associates": {
                    "H": 3,
                    "S": 4
                },
                "bachelors": {
                    "H": 4,
                    "S": 5
                },
                "Police Academy": 10,
                "Firefighter Academy": 10,
                "Flight School": 10
            },
            "timeBlocksByProgram": {
                "associates": 2,
                "bachelors": 2,
                "Police Academy": 4,
                "Firefighter Academy": 4,
                "Flight School": 4
            }
        },
        "discounts": {}
    },
    {
        "name": "Work on Thesis",
        "category": ["schoolwork"],
        "executionType": "both",
        "frequency": "once_per_year",
        "requirements": {
            "eligibleProgramNames": ["Law School"],
            "eligibleProgramTypes": ["masters"]
        },
        "cost": 0,
        "costFormula": "none",
        "minTimeBlocks": 1,
        "maxTimeBlocks": null,
        "seniorDiscount": false,
        "effects": {
            "skillGains": "program",
            "stressByProgram": {
                "masters": {
                    "H": 20,
                    "S": 22
                },
                "Law School": 12
            },
            "timeBlocksByProgram": {
                "masters": 8,
                "Law School": 4
            }
        },
        "discounts": {}
    },
    {
        "name": "Work on Dissertation",
        "category": ["schoolwork"],
        "executionType": "both",
        "frequency": "once_per_year",
        "requirements": {
            "eligibleProgramTypes": ["doctorate"]
        },
        "cost": 0,
        "costFormula": "none",
        "minTimeBlocks": 10,
        "maxTimeBlocks": 10,
        "seniorDiscount": false,
        "effects": {
            "skillGains": "program",
            "stress": {
                "H": 25,
                "S": 27
            }
        },
        "discounts": {}
    },
    {
        "name": "Publish a Paper",
        "category": ["schoolwork"],
        "executionType": "both",
        "frequency": "once_per_year",
        "requirements": {
            "eligibleProgramTypes": ["doctorate"]
        },
        "cost": 0,
        "costFormula": "none",
        "minTimeBlocks": 6,
        "maxTimeBlocks": 6,
        "seniorDiscount": false,
        "effects": {
            "skillGains": "program",
            "stress": {
                "H": 15,
                "S": 17
            }
        },
        "discounts": {}
    },
    {
        "name": "Speak at a Conference",
        "category": ["schoolwork"],
        "executionType": "both",
        "frequency": "once_per_year",
        "requirements": {
            "eligibleProgramTypes": ["doctorate"]
        },
        "cost": 0,
        "costFormula": "none",
        "minTimeBlocks": 2,
        "maxTimeBlocks": 2,
        "seniorDiscount": false,
        "effects": {
            "skillGains": "program",
            "stress": {
                "H": 5,
                "S": 7
            }
        },
        "discounts": {}
    },
    {
        "name": "Attend Life Skills Seminar",
        "category": ["skill-development"],
        "executionType": "both",
        "frequency": "unlimited",
        "requirements": {},
        "cost": 25,
        "costFormula": "per_time_block",
        "minTimeBlocks": 1,
        "maxTimeBlocks": null,
        "seniorDiscount": false,
        "effects": {
            "perseverancePerBlock": 3,
            "organizationPerBlock": 3,
            "communicationPerBlock": 3,
            "stressTolerancePerBlock": 3,
            "mathPerBlock": 1,
            "technologyPerBlock": 1,
            "lemons": 1
        },
        "discounts": {}
    },
    {
        "name": "Take an Art Class",
        "category": ["skill-development"],
        "executionType": "both",
        "frequency": "unlimited",
        "requirements": {},
        "cost": 10,
        "costFormula": "per_time_block",
        "minTimeBlocks": 1,
        "maxTimeBlocks": null,
        "seniorDiscount": false,
        "effects": {
            "artPerBlock": 1,
            "creativityPerBlock": 3,
            "lemonsPerBlock": 1
        },
        "discounts": {}
    },
    {
        "name": "Take a Cooking Class",
        "category": ["skill-development"],
        "executionType": "both",
        "frequency": "unlimited",
        "requirements": {},
        "cost": 10,
        "costFormula": "per_time_block",
        "minTimeBlocks": 1,
        "maxTimeBlocks": null,
        "seniorDiscount": false,
        "effects": {
            "cautionPerBlock": 1,
            "organizationPerBlock": 1,
            "lemonsPerBlock": 1
        },
        "discounts": {}
    },
    {
        "name": "Learn a New Language",
        "category": ["skill-development"],
        "executionType": "both",
        "frequency": "unlimited",
        "requirements": {},
        "cost": 10,
        "costFormula": "per_time_block",
        "minTimeBlocks": 1,
        "maxTimeBlocks": null,
        "seniorDiscount": false,
        "effects": {
            "communicationPerBlock": 2,
            "lemonsPerBlock": 1
        },
        "discounts": {}
    },
    {
        "name": "Learn an Instrument",
        "category": ["skill-development"],
        "executionType": "both",
        "frequency": "unlimited",
        "requirements": {},
        "cost": 10,
        "costFormula": "per_time_block",
        "minTimeBlocks": 1,
        "maxTimeBlocks": null,
        "seniorDiscount": false,
        "effects": {
            "musicPerBlock": 1,
            "lemonsPerBlock": 1
        },
        "discounts": {}
    },
    {
        "name": "Learn a New Recipe",
        "category": ["skill-development"],
        "executionType": "both",
        "frequency": "unlimited",
        "requirements": {},
        "cost": 0,
        "costFormula": "none",
        "minTimeBlocks": 1,
        "maxTimeBlocks": null,
        "seniorDiscount": false,
        "effects": {
            "cautionPerBlock": 1,
            "organizationPerBlock": 1,
            "lemonsPerBlock": 1
        },
        "discounts": {}
    },
    {
        "name": "Take a Martial Arts Class",
        "category": ["skill-development"],
        "executionType": "both",
        "frequency": "unlimited",
        "requirements": {
            "health": 40
        },
        "cost": 300,
        "costFormula": "per_time_block",
        "minTimeBlocks": 1,
        "maxTimeBlocks": null,
        "seniorDiscount": false,
        "effects": {
            "physicalAbilityPerBlock": 3,
            "perseverancePerBlock": 3,
            "patiencePerBlock": 3,
            "lemons": 1
        },
        "discounts": {}
    },
    {
        "name": "Join Community Theater",
        "category": ["skill-development"],
        "executionType": "both",
        "frequency": "four_per_year",
        "requirements": {},
        "cost": 0,
        "costFormula": "none",
        "minTimeBlocks": 6,
        "maxTimeBlocks": 24,
        "timeBlockIncrement": 6,
        "seniorDiscount": false,
        "effects": {
            "charisma": 5,
            "music": 2,
            "creativity": 5,
            "sociability": 5,
            "stress": 2,
            "lemons": 2
        },
        "discounts": {}
    },
    {
        "name": "Take a Photography Class",
        "category": ["skill-development"],
        "executionType": "both",
        "frequency": "unlimited",
        "requirements": {},
        "cost": 150,
        "costFormula": "per_time_block",
        "minTimeBlocks": 1,
        "maxTimeBlocks": null,
        "seniorDiscount": false,
        "effects": {
            "artPerBlock": 1,
            "creativityPerBlock": 3,
            "lemonsPerBlock": 1
        },
        "discounts": {}
    },
    {
        "name": "Join Toastmasters",
        "category": ["skill-development"],
        "executionType": "both",
        "frequency": "once_per_year",
        "requirements": {},
        "cost": 90,
        "costFormula": "none",
        "minTimeBlocks": 6,
        "maxTimeBlocks": 6,
        "seniorDiscount": false,
        "effects": {
            "communication": 10,
            "bravery": 10,
            "stress": 10,
            "lemons": 2
        },
        "discounts": {}
    },
    {
        "name": "Take an Acting Class",
        "category": ["skill-development", "actor-career"],
        "executionType": "both",
        "frequency": "unlimited",
        "requirements": {},
        "cost": 300,
        "costFormula": "none",
        "minTimeBlocks": 2,
        "maxTimeBlocks": 2,
        "seniorDiscount": false,
        "effects": {
            "bravery": 5,
            "charisma": 5,
            "creativity": 5
        },
        "discounts": {}
    },
    {
        "name": "Take a Programming Class",
        "category": ["skill-development"],
        "executionType": "both",
        "frequency": "unlimited",
        "requirements": {},
        "cost": 10,
        "costFormula": "per_time_block",
        "minTimeBlocks": 1,
        "maxTimeBlocks": null,
        "seniorDiscount": false,
        "effects": {
            "technologyPerBlock": 1,
            "lemonsPerBlock": 1
        },
        "discounts": {}
    },
    {
        "name": "Attend Home Improvement Workshop",
        "category": ["skill-development", "home-auto"],
        "executionType": "both",
        "frequency": "unlimited",
        "requirements": {},
        "cost": 10,
        "costFormula": "per_time_block",
        "minTimeBlocks": 1,
        "maxTimeBlocks": null,
        "seniorDiscount": false,
        "effects": {
            "homeRepairPerBlock": 1,
            "lemonsPerBlock": 1
        },
        "discounts": {}
    },
    {
        "name": "Get Housing",
        "category": ["home-auto"],
        "executionType": "both",
        "frequency": "unlimited",
        "requirements": {},
        "cost": 0,
        "costFormula": "none",
        "minTimeBlocks": 2,
        "maxTimeBlocks": 2,
        "seniorDiscount": false,
        "effects": {
            "stress": 10,
            "extraBlocksIfSelling": 2
        },
        "discounts": {}
    },
    {
        "name": "Get Transportation",
        "category": ["home-auto"],
        "executionType": "both",
        "frequency": "unlimited",
        "requirements": {},
        "cost": 0,
        "costFormula": "none",
        "minTimeBlocks": 2,
        "maxTimeBlocks": 2,
        "seniorDiscount": false,
        "effects": {
            "stress": 5,
            "extraBlocksIfSelling": 2,
            "publicTransitTimeBlocks": 0,
            "publicTransitStress": 0
        },
        "discounts": {}
    },
    {
        "name": "Remodel Home",
        "category": ["home-auto", "luxury"],
        "executionType": "both",
        "frequency": "unlimited",
        "requirements": {
            "eligibleHousingNames": ["2-Bedroom (Suburb)", "3-Bedroom (Suburb)", "4-Bedroom (Suburb)", "5-Bedroom (Suburb)", "6-Bedroom (Suburb)"]
        },
        "cost": 0,
        "costFormula": "none",
        "minTimeBlocks": 0,
        "maxTimeBlocks": 0,
        "seniorDiscount": false,
        "effects": {
            "homeValueIncreasePctMin": 0.5,
            "homeValueIncreasePctMax": 0.8
        },
        "discounts": {}
    },
    {
        "name": "Install a Pool",
        "category": ["home-auto", "luxury"],
        "executionType": "both",
        "frequency": "unlimited",
        "requirements": {
            "eligibleHousingNames": ["2-Bedroom (Suburb)", "3-Bedroom (Suburb)", "4-Bedroom (Suburb)", "5-Bedroom (Suburb)", "6-Bedroom (Suburb)"],
            "hasPool": false
        },
        "cost": 0,
        "costFormula": "none",
        "minTimeBlocks": 0,
        "maxTimeBlocks": 0,
        "seniorDiscount": false,
        "effects": {
            "costBasePercent": 10,
            "costPerYearOwnedPercent": 2,
            "costBasis": "originalHomeValue",
            "annualMaintenance": 1500,
            "stress": 10,
            "hasPool": true
        },
        "discounts": {}
    },
    {
        "name": "Install Solar Panels",
        "category": ["home-auto", "luxury"],
        "executionType": "both",
        "frequency": "unlimited",
        "requirements": {
            "eligibleHousingNames": ["2-Bedroom (Suburb)", "3-Bedroom (Suburb)", "4-Bedroom (Suburb)", "5-Bedroom (Suburb)", "6-Bedroom (Suburb)"],
            "hasSolarPanels": false
        },
        "cost": 0,
        "costFormula": "none",
        "minTimeBlocks": 0,
        "maxTimeBlocks": 0,
        "seniorDiscount": false,
        "effects": {
            "costBasePercent": 5,
            "costPerYearOwnedPercent": 2,
            "costBasis": "originalHomeValue",
            "utilitiesDiscountPct": 60,
            "lemonsPerYear": 2
        },
        "discounts": {}
    },
    {
        "name": "Find Love",
        "category": ["family"],
        "executionType": "express",
        "frequency": "unlimited",
        "requirements": {
            "isMarried": false,
            "minCommunication": 50,
            "minCompassion": 50
        },
        "cost": 0,
        "costFormula": "none",
        "minTimeBlocks": 0,
        "maxTimeBlocks": 0,
        "seniorDiscount": false,
        "effects": {
            "noMatch": {
                "timeBlocks": 2,
                "lemons": 1
            },
            "matched": {
                "timeBlocks": 6,
                "lemons": 3,
                "weddingCostToPlayer": 15000,
                "note": "Marriage takes effect next year. While married each year: +1% communication, compassion, patience (max 20% total across all marriages)."
            },
            "whileMarriedPerYear": {
                "communication": 1,
                "compassion": 1,
                "patience": 1,
                "maxGainAcrossAllMarriages": 20
            }
        },
        "discounts": {}
    },
    {
        "name": "Get Divorced",
        "category": ["family"],
        "executionType": "express",
        "frequency": "unlimited",
        "requirements": {
            "isMarried": true,
            "maxCompatibilityScore": 3
        },
        "cost": 0,
        "costFormula": "by_compatibility_score",
        "minTimeBlocks": 0,
        "maxTimeBlocks": 0,
        "seniorDiscount": false,
        "effects": {
            "stress": 10,
            "splitMoneyAndSavings": true,
            "costByCompatibilityScore": {
                "3": { "timeBlocks": 1, "cost": 500 },
                "2": { "timeBlocks": 1, "cost": 10000 },
                "1": { "timeBlocks": 2, "cost": 20000 },
                "0": { "timeBlocks": 3, "cost": 100000 }
            },
            "note": "You keep house, car, kids. Money/savings/loans split. Divorce finalizes following year."
        },
        "discounts": {}
    },
    {
        "name": "Get Childcare",
        "category": ["family"],
        "executionType": "express",
        "frequency": "unlimited",
        "requirements": {
            "hasEligibleKids": true
        },
        "cost": 0,
        "costFormula": "by_childcare_plan",
        "minTimeBlocks": 0,
        "maxTimeBlocks": 0,
        "seniorDiscount": false,
        "effects": {
            "reducesKidsTimeBlocks": true,
            "childcareOptions": {
                "Year FT":              { "costPerChildPerYear": 12000 },
                "Year PT":              { "costPerChildPerYear": 6000 },
                "Year PT + Summer FT":  { "costPerChildPerYear": 7500 },
                "Summer FT":            { "costPerChildPerYear": 3000 },
                "Summer PT":            { "costPerChildPerYear": 1500 }
            },
            "note": "Reduces 'taking care of kids' time blocks by what they would have been. Stops automatically when child turns 13."
        },
        "discounts": {}
    },
    {
        "name": "Try to Have Child",
        "category": ["family"],
        "executionType": "express",
        "frequency": "unlimited",
        "requirements": {
            "maxAge": 45
        },
        "cost": 0,
        "costFormula": "none",
        "minTimeBlocks": 2,
        "maxTimeBlocks": 2,
        "seniorDiscount": false,
        "effects": {
            "pregnancyChanceByAge": {
                "under30":  0.95,
                "31to35":   0.80,
                "36to40":   0.60,
                "41to45":   0.25
            },
            "multiplesBirthChance": {
                "singleton": 0.94,
                "twins":     0.05,
                "triplets":  0.01
            },
            "birthSuccessRateByAge": {
                "under30":  0.97,
                "31to35":   0.93,
                "36to40":   0.85,
                "41to45":   0.60
            },
            "birthCosts": {
                "withInsurance":    { "singleton": 3000,  "twinsPerBaby": 2500,  "tripletsPerBaby": 2250 },
                "withoutInsurance": { "singleton": 20000, "twinsPerBaby": 50000, "tripletsPerBaby": 125000 },
                "stillbirthWithInsurance":    7500,
                "stillbirthWithoutInsurance": 30000
            },
            "ongoingLemonsPerChildPerYear": {
                "goodWithKidsUnder40":  2,
                "goodWithKidsUnder80":  3,
                "goodWithKids80plus":   4
            },
            "ongoingTraitGainsPerYear": {
                "patience":    2,
                "compassion":  2,
                "organization":2,
                "caution":     2,
                "goodWithKids":2
            },
            "stressPerKidTimeBlock": 4,
            "stressIfUnsuccessful":  2
        },
        "discounts": {}
    },
    {
        "name": "Adopt a Pet",
        "category": ["family", "animals"],
        "executionType": "express",
        "frequency": "unlimited",
        "requirements": {
            "atMaxPets": false
        },
        "cost": 0,
        "costFormula": "none",
        "minTimeBlocks": 0,
        "maxTimeBlocks": 0,
        "seniorDiscount": false,
        "effects": {
            "largePetCost": 100,
            "smallPetCost": 20,
            "annualVetLarge": 1000,
            "annualVetSmall": 75,
            "lemonsPerPetPerYear": 2
        },
        "discounts": {}
    },
    {
        "name": "Put Pet Up for Adoption",
        "category": ["animals", "family"],
        "executionType": "express",
        "frequency": "once_per_year",
        "requirements": {
            "hasPet": true
        },
        "cost": 0,
        "costFormula": "none",
        "minTimeBlocks": 0,
        "maxTimeBlocks": 0,
        "seniorDiscount": false,
        "effects": {
            "removePets": true
        },
        "discounts": {}
    },
    {
        "name": "Apply to Adopt Child",
        "category": ["family"],
        "executionType": "express",
        "frequency": "unlimited",
        "requirements": {
            "minAge": 21,
            "maxAge": 55,
            "minIncome": { "base": 50000, "perPersonIncludingNewChild": 10000 },
            "maxDebt": 0,
            "goodWithKids": 50,
            "compassion": 60,
            "maxStress": 60,
            "houseNotOverCapacity": true
        },
        "cost": 0,
        "costFormula": "none",
        "minTimeBlocks": 6,
        "maxTimeBlocks": 6,
        "seniorDiscount": false,
        "effects": {
            "isGoodDeedOpportunity": true,
            "isGoodDeedOpportunityOnCompletion": true,
            "lemonsByChildAge": [
                { "minAge": 0, "maxAge": 2, "lemons": 2 },
                { "minAge": 3, "maxAge": 9, "lemons": 3 },
                { "minAge": 10, "maxAge": 17, "lemons": 4 }
            ]
        },
        "discounts": {}
    },
    {
        "name": "Perform at Bar",
        "category": ["musician-career"],
        "executionType": "both",
        "frequency": "unlimited",
        "requirements": {
            "music": 9,
            "bravery": 20
        },
        "cost": 0,
        "costFormula": "none",
        "minTimeBlocks": 2,
        "maxTimeBlocks": 2,
        "seniorDiscount": false,
        "effects": {
            "music": 2,
            "bravery": 10,
            "charisma": 2,
            "income": 500,
            "stress": 2
        },
        "discounts": {}
    },
    {
        "name": "Perform at School Dance",
        "category": ["musician-career"],
        "executionType": "both",
        "frequency": "unlimited",
        "requirements": {
            "music": 9,
            "bravery": 20
        },
        "cost": 0,
        "costFormula": "none",
        "minTimeBlocks": 2,
        "maxTimeBlocks": 2,
        "seniorDiscount": false,
        "effects": {
            "music": 2,
            "bravery": 10,
            "charisma": 2,
            "income": 500,
            "stress": 2
        },
        "discounts": {}
    },
    {
        "name": "Perform at County Fair",
        "category": ["musician-career"],
        "executionType": "both",
        "frequency": "unlimited",
        "requirements": {
            "music": 9,
            "bravery": 20
        },
        "cost": 0,
        "costFormula": "none",
        "minTimeBlocks": 2,
        "maxTimeBlocks": 2,
        "seniorDiscount": false,
        "effects": {
            "music": 2,
            "bravery": 10,
            "charisma": 2,
            "income": 500,
            "stress": 2
        },
        "discounts": {}
    },
    {
        "name": "Release EP",
        "category": ["musician-career"],
        "executionType": "both",
        "frequency": "unlimited",
        "requirements": {
            "music": 40,
            "creativity": 75
        },
        "cost": 0,
        "costFormula": "none",
        "minTimeBlocks": 10,
        "maxTimeBlocks": 10,
        "seniorDiscount": false,
        "effects": {
            "music": 10,
            "creativity": 10,
            "patience": 5,
            "stress": 5,
            "salaryFormula": {
                "inputs": ["music", "creativity"],
                "tiers": [
                    { "min": 100, "max": 133, "label": "beginner",     "incomeMin": 0,      "incomeMax": 10000,    "distribution": "skewed_right" },
                    { "min": 134, "max": 167, "label": "intermediate", "incomeMin": 9000,   "incomeMax": 100000,   "distribution": "normal" },
                    { "min": 168, "max": 200, "label": "advanced",     "incomeMin": 50000,  "incomeMax": 10000000, "distribution": "skewed_left" }
                ]
            }
        },
        "discounts": {}
    },
    {
        "name": "Open for Tour Headliner",
        "category": ["musician-career"],
        "executionType": "both",
        "frequency": "unlimited",
        "requirements": {
            "music": 50,
            "creativity": 50,
            "charisma": 75,
            "bravery": 60
        },
        "cost": 0,
        "costFormula": "none",
        "minTimeBlocks": 4,
        "maxTimeBlocks": 4,
        "seniorDiscount": false,
        "effects": {
            "music": 5,
            "charisma": 10,
            "creativity": 2,
            "stress": 5,
            "salaryFormula": {
                "input": "charisma",
                "tiers": [
                    { "max": 80, "income": 40000 },
                    { "max": 90, "income": 60000 },
                    { "min": 91, "income": 80000 }
                ]
            }
        },
        "discounts": {}
    },
    {
        "name": "Release Album",
        "category": ["musician-career"],
        "executionType": "both",
        "frequency": "unlimited",
        "requirements": {
            "music": 70,
            "creativity": 90
        },
        "cost": 0,
        "costFormula": "none",
        "minTimeBlocks": 20,
        "maxTimeBlocks": 20,
        "seniorDiscount": false,
        "effects": {
            "music": 10,
            "creativity": 10,
            "patience": 10,
            "stress": 20,
            "salaryFormula": {
                "inputs": ["music", "creativity"],
                "tiers": [
                    { "min": 100, "max": 133, "label": "beginner",     "incomeMin": 0,      "incomeMax": 10000,    "distribution": "skewed_right" },
                    { "min": 134, "max": 167, "label": "intermediate", "incomeMin": 9000,   "incomeMax": 100000,   "distribution": "normal" },
                    { "min": 168, "max": 200, "label": "advanced",     "incomeMin": 50000,  "incomeMax": 10000000, "distribution": "skewed_left" }
                ]
            }
        },
        "discounts": {}
    },
    {
        "name": "Headline National Tour",
        "category": ["musician-career"],
        "executionType": "both",
        "frequency": "unlimited",
        "requirements": {
            "hasReleasedEPOrAlbum": true,
            "music": 80,
            "charisma": 85,
            "bravery": 85
        },
        "cost": 0,
        "costFormula": "none",
        "minTimeBlocks": 20,
        "maxTimeBlocks": 20,
        "seniorDiscount": false,
        "effects": {
            "music": 5,
            "charisma": 8,
            "creativity": 2,
            "stress": 40,
            "salaryFormula": {
                "incomeMin": 75000000,
                "incomeMax": 300000000,
                "distribution": "uniform"
            }
        },
        "discounts": {}
    },
    {
        "name": "Headline International Tour",
        "category": ["musician-career"],
        "executionType": "both",
        "frequency": "unlimited",
        "requirements": {
            "hasReleasedAlbum": true,
            "music": 80,
            "charisma": 95,
            "bravery": 90
        },
        "cost": 0,
        "costFormula": "none",
        "minTimeBlocks": 36,
        "maxTimeBlocks": 36,
        "seniorDiscount": false,
        "effects": {
            "music": 5,
            "charisma": 6,
            "creativity": 2,
            "stress": 60,
            "salaryFormula": {
                "incomeMin": 150000000,
                "incomeMax": 600000000,
                "distribution": "uniform"
            }
        },
        "discounts": {}
    },
    {
        "name": "Write a Book",
        "category": ["author-career"],
        "executionType": "express",
        "frequency": "unlimited",
        "requirements": {
            "perseverance": 60,
            "organization": 50
        },
        "cost": 0,
        "costFormula": "none",
        "minTimeBlocks": 1,
        "maxTimeBlocks": null,
        "seniorDiscount": false,
        "effects": {
            "writingPerBlock": 1,
            "creativityPerBlock": 1,
            "stressPerBlock": 1
        },
        "discounts": {}
    },
    {
        "name": "Self-Publish Book",
        "category": ["author-career"],
        "executionType": "express",
        "frequency": "unlimited",
        "requirements": {
            "writeABookTimeBlocksCompleted": 20,
            "hasUnpublishedBook": true
        },
        "cost": 2500,
        "costFormula": "none",
        "minTimeBlocks": 2,
        "maxTimeBlocks": 2,
        "seniorDiscount": false,
        "effects": {
            "stress": 10,
            "bookPublished": true,
            "salaryFormula": {
                "inputs": ["writing", "creativity"],
                "tiers": [
                    { "max": 149, "income": 25000 },
                    { "min": 150, "income": 50000 }
                ]
            }
        },
        "discounts": {}
    },
    {
        "name": "Submit Book to Publisher",
        "category": ["author-career"],
        "executionType": "express",
        "frequency": "unlimited",
        "requirements": {
            "writeABookTimeBlocksCompleted": 20,
            "hasUnpublishedBook": true
        },
        "cost": 1000,
        "costFormula": "none",
        "minTimeBlocks": 2,
        "maxTimeBlocks": 2,
        "seniorDiscount": false,
        "effects": {
            "stress": 10,
            "publishCriteria": { "writing": 80, "creativity": 70 },
            "salaryFormula": {
                "incomeMin": 100000,
                "incomeMax": 1000000,
                "distribution": "uniform"
            }
        },
        "discounts": {}
    },
    {
        "name": "Audition for Commercials",
        "category": ["actor-career"],
        "executionType": "express",
        "frequency": "unlimited",
        "requirements": {
            "bravery": 20,
            "perseverance": 50
        },
        "cost": 0,
        "costFormula": "none",
        "minTimeBlocks": 2,
        "maxTimeBlocks": 2,
        "seniorDiscount": false,
        "effects": {
            "success": {
                "income": 500,
                "bravery": 10,
                "charisma": 2,
                "perseverance": 5,
                "stress": 5
            },
            "failure": {
                "perseverance": 3,
                "bravery": 7,
                "stress": 5
            }
        },
        "discounts": {}
    },
    {
        "name": "Audition for Movies",
        "category": ["actor-career"],
        "executionType": "express",
        "frequency": "unlimited",
        "requirements": {
            "bravery": 50,
            "perseverance": 50
        },
        "cost": 0,
        "costFormula": "none",
        "minTimeBlocks": 2,
        "maxTimeBlocks": 2,
        "seniorDiscount": false,
        "effects": {
            "successChance": {
                "inputs": ["bravery", "charisma", "creativity"],
                "tiers": [
                    { "min": 220, "max": 247, "label": "beginner",     "chance": 0.20 },
                    { "min": 248, "max": 273, "label": "intermediate", "chance": 0.35 },
                    { "min": 274, "max": 300, "label": "advanced",     "chance": 0.50 }
                ]
            },
            "success": {
                "bravery": 10,
                "charisma": 10,
                "perseverance": 5,
                "creativity": 5,
                "timeBlocks": 5,
                "stress": 5,
                "salaryFormula": {
                    "input": "actingTraitsSum",
                    "lowerBound": { "a": 0.78,  "b": 1.048  },
                    "upperBound": { "a": 0.10,  "b": 1.0725 }
                }
            },
            "failure": {
                "perseverance": 3,
                "bravery": 7,
                "stress": 5
            }
        },
        "discounts": {}
    },
    {
        "name": "Audition for TV Shows",
        "category": ["actor-career"],
        "executionType": "express",
        "frequency": "unlimited",
        "requirements": {
            "bravery": 50,
            "perseverance": 50
        },
        "cost": 0,
        "costFormula": "none",
        "minTimeBlocks": 2,
        "maxTimeBlocks": 2,
        "seniorDiscount": false,
        "effects": {
            "successChance": {
                "inputs": ["bravery", "charisma", "creativity"],
                "tiers": [
                    { "min": 220, "max": 247, "label": "beginner",     "chance": 0.20 },
                    { "min": 248, "max": 273, "label": "intermediate", "chance": 0.35 },
                    { "min": 274, "max": 300, "label": "advanced",     "chance": 0.50 }
                ]
            },
            "success": {
                "bravery": 10,
                "charisma": 8,
                "perseverance": 5,
                "creativity": 8,
                "timeBlocks": 7,
                "stress": 5,
                "salaryFormula": {
                    "input": "actingTraitsSum",
                    "lowerBound": { "a": 0.78,  "b": 1.048  },
                    "upperBound": { "a": 0.10,  "b": 1.0725 }
                }
            },
            "failure": {
                "perseverance": 3,
                "bravery": 7,
                "stress": 5
            }
        },
        "discounts": {}
    },
    {
        "name": "Stay Up Late",
        "category": ["other"],
        "executionType": "express",
        "frequency": "unlimited",
        "requirements": {},
        "cost": 0,
        "costFormula": "none",
        "minTimeBlocks": 0,
        "maxTimeBlocks": 0,
        "seniorDiscount": false,
        "effects": {
            "healthTemp": -4,
            "healthPerm": -1,
            "stress": 5,
            "gainTimeBlock": 1
        },
        "discounts": {}
    }
];
  for (const a of actions) {
    await prisma.action.upsert({ where: { name: a.name }, update: a, create: a });
  }
  console.log(`  ✓ ${actions.length} actions`);
}



