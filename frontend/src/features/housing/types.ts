/**
 * Housing feature types
 * Requirements: Req 12, Req 42
 */

export interface HousingItem {
  id: string;
  name: string;
  type: 'parent' | 'dorm' | 'apartment' | 'house';
  location: 'city' | 'suburb' | 'both';
  isRental: boolean;
  rentPerYear: number | null;
  purchasePrice: number | null;
  utilitiesBase: number;
  utilitiesPerPerson: number;
  insurancePerYear: number | null;
  recommendedOccupancy: number;
  maxOccupancy: number;
  maxKids: number; // -1 = no restriction, 0 = no children allowed
  petLimitLarge: number;
  petLimitSmall: number;
  ageLimit: number | null;
  requiresEnrollment: boolean;
  allowsRemodeling: boolean;
  allowsPool: boolean;
  allowsSolarPanels: boolean;
  // Annotated by API
  eligible: boolean;
  eligibilityReasons: string[];
  warnings: string[];
  isCurrentHome: boolean;
  estimatedAnnualCost: number;
}

export interface HomeImprovement {
  type: 'remodel' | 'pool' | 'solar_panels';
  cost: number;
  valueIncrease: number;
  annualMaintenanceCost?: number;
  appliedAge: number;
}

export interface HousingOwnership {
  id: string;
  housingId: string;
  startAge: number;
  endAge?: number;
  isRental: boolean;
  purchasePrice?: number;
  salePrice?: number;
  totalRentPaid: number;
  yearsLived: number;
  chosenLocation: string;
  improvements: HomeImprovement[];
  housing?: HousingItem;
}

export interface HousingFilters {
  location: 'city' | 'suburb' | '';
  rentalOnly: boolean;
  buyOnly: boolean;
  maxCost: number | null;
  minCapacity: number | null;
  showAll: boolean;
  eligibleOnly: boolean;
}
