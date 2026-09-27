import { PrismaClient } from '@prisma/client';

export async function seedVehicles(prisma: PrismaClient) {
  type VehicleBase = {
    name: string; type: string; fuelType: string;
    passengerCapacity: number; gasPerYear: number; insuranceBase: number;
    restrictedToArea: boolean; canBeParentGift: boolean;
    annualCost?: number;
    newCost: number; used5Cost: number | null; used10Cost: number | null;
  };
  const bases: VehicleBase[] = [
    { name: 'Bike',                           type: 'bike',           fuelType: 'none',     passengerCapacity: 1,  gasPerYear: 0,    insuranceBase: 0,    restrictedToArea: true,  canBeParentGift: true,  newCost: 500,    used5Cost: null,  used10Cost: null },
    { name: 'Public Transit',                 type: 'public_transit', fuelType: 'none',     passengerCapacity: 1,  gasPerYear: 0,    insuranceBase: 0,    restrictedToArea: false, canBeParentGift: false, newCost: 1000,   used5Cost: null,  used10Cost: null, annualCost: 1000 },
    { name: 'Motorcycle',                     type: 'motorcycle',     fuelType: 'gas',      passengerCapacity: 1,  gasPerYear: 800,  insuranceBase: 1000, restrictedToArea: false, canBeParentGift: false, newCost: 5000,   used5Cost: 2200,  used10Cost: 1700 },
    { name: 'Affordable 2-Seater (Gas)',      type: 'car',            fuelType: 'gas',      passengerCapacity: 2,  gasPerYear: 1400, insuranceBase: 0,    restrictedToArea: false, canBeParentGift: false, newCost: 12000,  used5Cost: 5000,  used10Cost: 2000 },
    { name: 'Affordable 2-Seater (Hybrid)',   type: 'car',            fuelType: 'hybrid',   passengerCapacity: 2,  gasPerYear: 700,  insuranceBase: 0,    restrictedToArea: false, canBeParentGift: false, newCost: 13000,  used5Cost: 5000,  used10Cost: 2000 },
    { name: 'Affordable 2-Seater (Electric)', type: 'car',            fuelType: 'electric', passengerCapacity: 2,  gasPerYear: 0,    insuranceBase: 0,    restrictedToArea: false, canBeParentGift: false, newCost: 15000,  used5Cost: 5500,  used10Cost: 2500 },
    { name: 'Luxury 2-Seater (Gas)',          type: 'car',            fuelType: 'gas',      passengerCapacity: 2,  gasPerYear: 1400, insuranceBase: 0,    restrictedToArea: false, canBeParentGift: false, newCost: 55000,  used5Cost: 20000, used10Cost: 9000 },
    { name: 'Luxury 2-Seater (Hybrid)',       type: 'car',            fuelType: 'hybrid',   passengerCapacity: 2,  gasPerYear: 700,  insuranceBase: 0,    restrictedToArea: false, canBeParentGift: false, newCost: 95000,  used5Cost: 35000, used10Cost: 15500 },
    { name: 'Luxury 2-Seater (Electric)',     type: 'car',            fuelType: 'electric', passengerCapacity: 2,  gasPerYear: 0,    insuranceBase: 0,    restrictedToArea: false, canBeParentGift: true,  newCost: 100000, used5Cost: 40000, used10Cost: 16000 },
    { name: 'Affordable 5-Seater (Gas)',      type: 'car',            fuelType: 'gas',      passengerCapacity: 5,  gasPerYear: 1800, insuranceBase: 0,    restrictedToArea: false, canBeParentGift: true,  newCost: 25000,  used5Cost: 9500,  used10Cost: 4000 },
    { name: 'Affordable 5-Seater (Hybrid)',   type: 'car',            fuelType: 'hybrid',   passengerCapacity: 5,  gasPerYear: 900,  insuranceBase: 0,    restrictedToArea: false, canBeParentGift: true,  newCost: 35000,  used5Cost: 13500, used10Cost: 5500 },
    { name: 'Affordable 5-Seater (Electric)', type: 'car',            fuelType: 'electric', passengerCapacity: 5,  gasPerYear: 0,    insuranceBase: 0,    restrictedToArea: false, canBeParentGift: true,  newCost: 45000,  used5Cost: 17000, used10Cost: 7000 },
    { name: 'Luxury 5-Seater (Gas)',          type: 'car',            fuelType: 'gas',      passengerCapacity: 5,  gasPerYear: 1800, insuranceBase: 0,    restrictedToArea: false, canBeParentGift: false, newCost: 50000,  used5Cost: 20000, used10Cost: 8000 },
    { name: 'Luxury 5-Seater (Hybrid)',       type: 'car',            fuelType: 'hybrid',   passengerCapacity: 5,  gasPerYear: 900,  insuranceBase: 0,    restrictedToArea: false, canBeParentGift: false, newCost: 60000,  used5Cost: 25000, used10Cost: 10000 },
    { name: 'Luxury 5-Seater (Electric)',     type: 'car',            fuelType: 'electric', passengerCapacity: 5,  gasPerYear: 0,    insuranceBase: 0,    restrictedToArea: false, canBeParentGift: false, newCost: 70000,  used5Cost: 26000, used10Cost: 11500 },
    { name: 'Affordable 7-Seater (Gas)',      type: 'car',            fuelType: 'gas',      passengerCapacity: 7,  gasPerYear: 3000, insuranceBase: 0,    restrictedToArea: false, canBeParentGift: false, newCost: 30000,  used5Cost: 11500, used10Cost: 5000 },
    { name: 'Affordable 7-Seater (Hybrid)',   type: 'car',            fuelType: 'hybrid',   passengerCapacity: 7,  gasPerYear: 1500, insuranceBase: 0,    restrictedToArea: false, canBeParentGift: false, newCost: 40000,  used5Cost: 15000, used10Cost: 6500 },
    { name: 'Luxury 7-Seater (Gas)',          type: 'car',            fuelType: 'gas',      passengerCapacity: 7,  gasPerYear: 3000, insuranceBase: 0,    restrictedToArea: false, canBeParentGift: false, newCost: 70000,  used5Cost: 26000, used10Cost: 11500 },
    { name: 'Luxury 7-Seater (Hybrid)',       type: 'car',            fuelType: 'hybrid',   passengerCapacity: 7,  gasPerYear: 1500, insuranceBase: 0,    restrictedToArea: false, canBeParentGift: false, newCost: 75000,  used5Cost: 28500, used10Cost: 12000 },
    { name: 'Affordable 8-Seater (Gas)',      type: 'car',            fuelType: 'gas',      passengerCapacity: 8,  gasPerYear: 3000, insuranceBase: 0,    restrictedToArea: false, canBeParentGift: false, newCost: 35000,  used5Cost: 13500, used10Cost: 5500 },
    { name: 'Affordable 8-Seater (Hybrid)',   type: 'car',            fuelType: 'hybrid',   passengerCapacity: 8,  gasPerYear: 1500, insuranceBase: 0,    restrictedToArea: false, canBeParentGift: false, newCost: 50000,  used5Cost: 20000, used10Cost: 8000 },
    { name: 'Luxury 8-Seater (Gas)',          type: 'car',            fuelType: 'gas',      passengerCapacity: 8,  gasPerYear: 3000, insuranceBase: 0,    restrictedToArea: false, canBeParentGift: false, newCost: 50000,  used5Cost: 20000, used10Cost: 8000 },
    { name: 'Luxury 8-Seater (Hybrid)',       type: 'car',            fuelType: 'hybrid',   passengerCapacity: 8,  gasPerYear: 1500, insuranceBase: 0,    restrictedToArea: false, canBeParentGift: false, newCost: 80000,  used5Cost: 30000, used10Cost: 13000 },
    { name: 'Affordable 11-Seater (Gas)',     type: 'car',            fuelType: 'gas',      passengerCapacity: 11, gasPerYear: 3000, insuranceBase: 0,    restrictedToArea: false, canBeParentGift: false, newCost: 40000,  used5Cost: 30000, used10Cost: 15000 },
  ];
  const ageVariants = [
    { ageVariant: 'new',      costKey: 'newCost'   as const },
    { ageVariant: 'used_5yr', costKey: 'used5Cost' as const },
    { ageVariant: 'used_10yr',costKey: 'used10Cost'as const },
  ];
  let count = 0;
  for (const base of bases) {
    const variants = base.used5Cost === null ? [ageVariants[0]] : ageVariants;
    for (const { ageVariant, costKey } of variants) {
      const data = {
        name: base.name, type: base.type, fuelType: base.fuelType, ageVariant,
        purchasePrice: base[costKey] as number | null,
        annualCost: base.annualCost ?? null,
        insuranceBase: base.insuranceBase, gasPerYear: base.gasPerYear, maintenanceBase: 0,
        passengerCapacity: base.passengerCapacity,
        restrictedToArea: base.restrictedToArea, canBeParentGift: base.canBeParentGift,
      };
      await prisma.vehicle.upsert({ where: { name_ageVariant: { name: base.name, ageVariant } }, update: data, create: data });
      count++;
    }
  }
  console.log(`  ✓ ${count} vehicle variants (${bases.length} models)`);
}
