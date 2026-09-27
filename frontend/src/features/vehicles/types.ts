/**
 * Vehicle feature types
 * Requirements: Req 13
 */

export interface VehicleItem {
  id: string;
  name: string;
  type: 'bike' | 'public_transit' | 'car' | 'motorcycle';
  fuelType: 'none' | 'gas' | 'electric' | 'hybrid';
  ageVariant: 'new' | 'used_5yr' | 'used_10yr';
  purchasePrice: number | null;
  annualCost: number | null; // public transit only
  insuranceBase: number;
  gasPerYear: number;
  maintenanceBase: number;
  passengerCapacity: number;
  restrictedToArea: boolean;
  canBeParentGift: boolean;
  // Annotated by API
  eligible: boolean;
  eligibilityReason?: string;
  bikeAreaRestriction: boolean;
  isCurrentPlayerVehicle: boolean;
  isCurrentSpouseVehicle: boolean;
  estimatedAnnualCosts: {
    insurance: number;
    gas: number;
    maintenance: number;
    total: number;
  };
}

export interface VehicleOwnershipDetail {
  id: string;
  vehicleId: string;
  startAge: number;
  purchasePrice: number | null;
  wasParentGift: boolean;
  isSpouseVehicle: boolean;
  totalMaintenancePaid: number;
  totalInsurancePaid: number;
  yearsOwned: number;
}

export interface OwnedVehicleEntry {
  ownership: VehicleOwnershipDetail;
  vehicle: VehicleItem;
  annualCosts: {
    insurance: number;
    gas: number;
    maintenance: number;
    total: number;
  };
  depreciatedValue: number | null;
  isMechanicDiscount: boolean;
}

export interface VehicleFilters {
  maxCost: number | null;
  minPeople: number | null;
  carOnly: boolean;
  nonCarOnly: boolean;
  fuelType: 'none' | 'gas' | 'electric' | 'hybrid' | '';
  ageVariant: 'new' | 'used_5yr' | 'used_10yr' | '';
  eligibleOnly: boolean;
}
